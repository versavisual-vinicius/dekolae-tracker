// Dekolaê Dedicated Performance & Cortesias Tracker API — DEKOLAÊ Sunset (ID: 590935)
// In-memory cache for event data to prevent Shotgun rate limits and ensure high performance
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache
let cachedData = null;
let lastCacheTime = 0;

const DEKOLAE_EVENT_ID = 590935;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  // Vercel Edge caching headers
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const organizerId = process.env.SHOTGUN_ORGANIZER_ID || '256131';
  const apiToken = process.env.SHOTGUN_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJJZCI6NzY0MjUsIm9yZ2FuaXplcklkIjoyNTYxMzEsImlhdCI6MTc4OTkzMjE0NH0.JdfLdQcYqT60gw04TQg20EpnrZFGhjfxrhfUOWkNsls';

  if (!apiToken) {
    return res.status(500).json({ error: 'SHOTGUN_API_TOKEN is not configured' });
  }

  const now = Date.now();

  // Return fresh cache if within TTL
  if (cachedData && (now - lastCacheTime < CACHE_TTL_MS)) {
    res.setHeader('X-Cache-Status', 'HIT');
    return res.status(200).json(cachedData);
  }

  try {
    // 1. Fetch Event metadata strictly for Dekolaê
    const eventsUrl = `https://smartboard-api.shotgun.live/api/shotgun/organizers/${organizerId}/events?key=${apiToken}&limit=100`;
    const eventsResp = await fetch(eventsUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!eventsResp.ok) {
      const errText = await eventsResp.text();
      return res.status(eventsResp.status).json({ error: 'Shotgun Events API failed', details: errText });
    }

    const eventsJson = await eventsResp.json();
    const rawEvents = eventsJson.data || [];
    const selectedEvent = rawEvents.find(e => e.id === DEKOLAE_EVENT_ID) || rawEvents.find(e => (e.slug || '').includes('dekola')) || rawEvents[0];

    if (!selectedEvent) {
      return res.status(404).json({ error: 'Evento Dekolaê (590935) não encontrado' });
    }

    // 2. Fetch all tickets for Dekolaê with pagination
    let tickets = [];
    let nextUrl = `https://api.shotgun.live/tickets?organizer_id=${organizerId}&event_id=${selectedEvent.id}`;
    let pageCount = 0;
    const maxPages = 50; // Safety cap: up to 5000 tickets

    while (nextUrl && pageCount < maxPages) {
      pageCount++;
      const tResp = await fetch(nextUrl, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      });
      if (!tResp.ok) break;
      const tJson = await tResp.json();
      if (tJson.data && Array.isArray(tJson.data)) {
        tickets.push(...tJson.data);
      }
      nextUrl = tJson.pagination?.next || null;
    }

    // 3. Process Valid Tickets (Strictly valid, exclude refunded, resold, canceled)
    const validTickets = tickets.filter(t => t.ticket_status === 'valid');

    // Separate courtesies vs commercial
    const isCourtesyTicket = (t) => 
      t.deal_channel === 'invitation' || 
      (t.deal_price === 0 && (
        (t.deal_title || '').toLowerCase().includes('vitória') || 
        (t.deal_title || '').toLowerCase().includes('vitoria') || 
        (t.deal_title || '').toLowerCase().includes('tribuna') ||
        (t.deal_title || '').toLowerCase().includes('cortesia') ||
        (t.deal_title || '').toLowerCase().includes('permuta') ||
        (t.deal_title || '').toLowerCase().includes('convidado') ||
        (t.deal_title || '').toLowerCase().includes('grupo sim') ||
        (t.deal_title || '').toLowerCase().includes('radio') ||
        (t.deal_title || '').toLowerCase().includes('imprensa') ||
        (t.deal_title || '').toLowerCase().includes('hotel') ||
        (t.deal_title || '').toLowerCase().includes('café') ||
        (t.deal_title || '').toLowerCase().includes('cafe') ||
        (t.deal_title || '').toLowerCase().includes('sorteio') ||
        (t.deal_title || '').toLowerCase().includes('friends') ||
        (t.deal_title || '').toLowerCase().includes('marcos')
      ));

    const courtesyTickets = validTickets.filter(isCourtesyTicket);
    const commercialTickets = validTickets.filter(t => !isCourtesyTicket(t));

    // Compute Faturamento (Gross Revenue in R$)
    let totalRevenue = 0;
    let paidTicketsCount = 0;
    let freeTicketsCount = 0;

    validTickets.forEach(t => {
      const priceCents = t.deal_price != null ? t.deal_price : 0;
      const priceReais = priceCents / 100;
      totalRevenue += priceReais;
      if (priceReais > 0) {
        paidTicketsCount++;
      } else {
        freeTicketsCount++;
      }
    });

    const ticketMedio = paidTicketsCount > 0 ? Math.round((totalRevenue / paidTicketsCount) * 100) / 100 : 0;

    // 4. Lotes / Deals metadata map
    const dealMetaMap = {};
    (selectedEvent.deals || []).forEach(d => {
      dealMetaMap[d.product_id] = {
        name: d.name,
        subcatName: d.subcategory?.name || 'Sem subcategoria',
        price: d.price || 0,
        quantity: d.quantity || 0,
        visibilities: d.visibilities || [],
        sales_channel: d.sales_channel
      };
    });

    // 5. Módulo Exclusivo de Cortesias & Permutas Institucionais
    const courtesyPartnersMap = {};
    const sectorCourtesies = {
      'Front Stage': 0,
      'Pista / Deck': 0,
      'Camarote Open Bar': 0,
      'Lounges': 0
    };

    const courtesyTimelineMap = {};

    courtesyTickets.forEach(t => {
      const dMeta = dealMetaMap[t.deal_id] || {};
      const subcat = (dMeta.subcatName || '').toLowerCase();
      const title = (t.deal_title || '').toLowerCase();

      let sector = 'Pista / Deck';
      if (subcat.includes('front') || title.includes('front')) {
        sector = 'Front Stage';
      } else if (subcat.includes('camarote') || title.includes('camarote')) {
        sector = 'Camarote Open Bar';
      } else if (subcat.includes('lounge') || title.includes('lounge') || title.includes('marcos')) {
        sector = 'Lounges';
      } else if (subcat.includes('pista') || subcat.includes('deck') || title.includes('pista') || title.includes('deck')) {
        sector = 'Pista / Deck';
      }

      sectorCourtesies[sector]++;

      const partnerKey = t.deal_title || 'Sem título';
      if (!courtesyPartnersMap[partnerKey]) {
        courtesyPartnersMap[partnerKey] = {
          partner: partnerKey,
          dealId: t.deal_id,
          sector,
          subcat: dMeta.subcatName || 'N/A',
          count: 0,
          dealChannel: t.deal_channel || 'invitation',
          qtyLimit: dMeta.quantity ?? 0,
          quotaStatus: (dMeta.quantity ?? 0) === 0 ? 'Fechado (Blindado)' : 'Cota Aberta',
          visibilities: dMeta.visibilities || [],
          lastIssued: t.ordered_at || t.created_at || '-'
        };
      }
      courtesyPartnersMap[partnerKey].count++;

      const dateStr = (t.ordered_at || '').slice(0, 10);
      if (dateStr) {
        courtesyTimelineMap[dateStr] = (courtesyTimelineMap[dateStr] || 0) + 1;
      }
    });

    const courtesyPartnersList = Object.values(courtesyPartnersMap).sort((a, b) => b.count - a.count);
    const courtesyTimeline = Object.entries(courtesyTimelineMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 6. Lotes / Deals breakdown mapped by unique product_id
    const dealsMap = new Map();
    (selectedEvent.deals || []).forEach(d => {
      const category = d.subcategory?.name || (
        d.name.toLowerCase().includes('camarote') ? 'CAMAROTE OPEN BAR' :
        d.name.toLowerCase().includes('front') ? 'FRONT STAGE' :
        d.name.toLowerCase().includes('lounge') ? 'LOUNGES' :
        d.name.toLowerCase().includes('pista') ? 'PISTA / DECK' : 'GERAL'
      );

      const isCourtesy = d.sales_channel === 'invitation' || 
        d.target === 'invitation' || 
        (d.price === 0 && (
          (d.name || '').toLowerCase().includes('cortesia') ||
          (d.name || '').toLowerCase().includes('permuta') ||
          (d.name || '').toLowerCase().includes('friends') ||
          (d.name || '').toLowerCase().includes('vitória') ||
          (d.name || '').toLowerCase().includes('tribuna') ||
          (d.name || '').toLowerCase().includes('radio') ||
          (d.name || '').toLowerCase().includes('imprensa')
        ));

      dealsMap.set(d.product_id, {
        dealId: d.product_id,
        name: d.name,
        category,
        hasSubcategory: !!d.subcategory,
        price: d.price || 0,
        capacity: d.quantity || 0,
        sold: 0,
        salesChannel: d.sales_channel,
        visibilities: d.visibilities || [],
        isCourtesy
      });
    });

    // Count tickets per deal
    validTickets.forEach(t => {
      if (dealsMap.has(t.deal_id)) {
        dealsMap.get(t.deal_id).sold++;
      } else {
        const fallbackKey = t.deal_id || t.deal_title || 'Outros';
        if (!dealsMap.has(fallbackKey)) {
          dealsMap.set(fallbackKey, {
            dealId: t.deal_id,
            name: t.deal_title || 'Geral',
            category: t.deal_sub_category || 'PISTA / DECK',
            hasSubcategory: true,
            price: (t.deal_price || 0) / 100,
            capacity: 0,
            sold: 0,
            salesChannel: t.sales_channel || 'online',
            visibilities: ['private'],
            isCourtesy: isCourtesyTicket(t)
          });
        }
        dealsMap.get(fallbackKey).sold++;
      }
    });

    const lotes = Array.from(dealsMap.values())
      .filter(d => d.sold > 0 || (d.visibilities && d.visibilities.includes('public')))
      .map(d => {
        const capacity = d.capacity > 0 ? d.capacity : d.sold;
        const remaining = d.capacity > 0 ? Math.max(0, d.capacity - d.sold) : 0;
        const percent = capacity > 0 ? Math.min(100, Math.round((d.sold / capacity) * 100)) : (d.sold > 0 ? 100 : 0);
        return {
          dealId: d.dealId,
          name: d.name,
          category: d.category,
          price: d.price,
          capacity,
          sold: d.sold,
          remaining,
          percent,
          isSoldOut: capacity > 0 && d.sold >= capacity,
          isCourtesy: !!d.isCourtesy,
          salesChannel: d.salesChannel,
          visibilities: d.visibilities
        };
      })
      .sort((a, b) => b.sold - a.sold);

    // 7. Categories summary
    const categoriesMap = {};
    lotes.forEach(l => {
      if (!categoriesMap[l.category]) {
        categoriesMap[l.category] = {
          name: l.category,
          sold: 0,
          capacity: 0,
          remaining: 0
        };
      }
      categoriesMap[l.category].sold += l.sold;
      categoriesMap[l.category].capacity += l.capacity;
      categoriesMap[l.category].remaining += l.remaining;
    });

    const categories = Object.values(categoriesMap).map(c => ({
      ...c,
      percent: c.capacity > 0 ? Math.round((c.sold / c.capacity) * 100) : 0
    })).sort((a, b) => b.sold - a.sold);

    // 8. UTM Attribution
    const utmCategories = {
      'Instagram / Meta Ads': 0,
      'Acesso Direto / Bio': 0,
      'Shotgun Orgânico': 0,
      'Promotores & Comissários': 0,
      'Mail Marketing': 0,
      'Outros Canais': 0
    };

    validTickets.forEach(t => {
      const src = (t.utm_source || '').toLowerCase();
      const med = (t.utm_medium || '').toLowerCase();
      const camp = (t.utm_campaign || '').toLowerCase();

      if (src.includes('instagram') || src.includes('meta') || src.includes('facebook') || src.includes('fb') || med.includes('instagram') || camp.includes('insta')) {
        utmCategories['Instagram / Meta Ads']++;
      } else if (src.includes('promoter') || med.includes('promoter') || camp.includes('promoter')) {
        utmCategories['Promotores & Comissários']++;
      } else if (src.includes('mail') || src.includes('email') || med.includes('email')) {
        utmCategories['Mail Marketing']++;
      } else if (src === 'shotgun' || src === 'shotgun_app' || src === 'app') {
        utmCategories['Shotgun Orgânico']++;
      } else if (!src || src === 'direct' || src === 'none' || src === 'web') {
        utmCategories['Acesso Direto / Bio']++;
      } else {
        utmCategories['Outros Canais']++;
      }
    });

    const utmBreakdown = Object.entries(utmCategories)
      .map(([channel, count]) => ({
        channel,
        count,
        percent: validTickets.length > 0 ? Math.round((count / validTickets.length) * 100) : 0
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    // 9. Pacing & Velocidade (24h / 7d e Daily Timeline)
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    let salesLast24h = 0;
    let salesLast7d = 0;
    let revenueLast24h = 0;
    let revenueLast7d = 0;

    const salesByDayMap = {};

    validTickets.forEach(t => {
      const orderedAt = t.ordered_at ? new Date(t.ordered_at) : null;
      const price = (t.deal_price || 0) / 100;
      if (!orderedAt || isNaN(orderedAt.getTime())) return;

      if (orderedAt >= twentyFourHoursAgo) {
        salesLast24h++;
        revenueLast24h += price;
      }
      if (orderedAt >= sevenDaysAgo) {
        salesLast7d++;
        revenueLast7d += price;
      }

      const dateKey = orderedAt.toISOString().slice(0, 10);
      salesByDayMap[dateKey] = (salesByDayMap[dateKey] || 0) + 1;
    });

    const dailyTimeline = Object.entries(salesByDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    let peakDay = null;
    let peakCount = 0;
    dailyTimeline.forEach(d => {
      if (d.count > peakCount) {
        peakCount = d.count;
        peakDay = d.date;
      }
    });

    // 10. Check-in Stats
    const scannedCount = validTickets.filter(t => t.ticket_scanned_at).length;
    const checkinStats = {
      scanned: scannedCount,
      pending: Math.max(0, validTickets.length - scannedCount),
      totalValid: validTickets.length,
      scannedPercent: validTickets.length > 0 ? Math.round((scannedCount / validTickets.length) * 100) : 0
    };

    // 11. Buyer List (com filtro/busca e exportação CSV)
    const buyersMap = {};
    validTickets.forEach(t => {
      const email = t.contact_email || `anonymous-${t.ticket_id}@order.shotgun`;
      if (!buyersMap[email]) {
        buyersMap[email] = {
          name: [t.contact_first_name, t.contact_last_name].filter(Boolean).join(' ') || 'Titular',
          email: t.contact_email || '-',
          phone: t.contact_phone || '-',
          locality: t.contact_locality || '-',
          dealTitle: t.deal_title || '-',
          price: (t.deal_price || 0) / 100,
          isCourtesy: isCourtesyTicket(t),
          orderedAt: t.ordered_at || '-',
          status: t.ticket_status || 'valid'
        };
      }
    });
    const buyerList = Object.values(buyersMap);

    // Final response payload
    const result = {
      updatedAt: new Date().toISOString(),
      contractor: 'dekolae',
      event: {
        id: selectedEvent.id,
        name: selectedEvent.name,
        slug: selectedEvent.slug,
        startTime: selectedEvent.startTime,
        endTime: selectedEvent.endTime,
        coverUrl: selectedEvent.coverUrl || selectedEvent.coverThumbnailUrl,
        leftTicketsCount: selectedEvent.leftTicketsCount || 0,
        // Financial Metrics
        totalRevenue,
        paidRevenue: totalRevenue,
        ticketMedio,
        paidTicketsCount,
        freeTicketsCount,
        revenueLast24h,
        revenueLast7d,
        // Volume Metrics
        totalSold: validTickets.length,
        commercialSold: commercialTickets.length,
        courtesySold: courtesyTickets.length,
        commercialPercent: Number(((commercialTickets.length / validTickets.length) * 100).toFixed(1)),
        courtesyPercent: Number(((courtesyTickets.length / validTickets.length) * 100).toFixed(1)),
        validTicketsCount: validTickets.length,
        pacing: {
          last24h: salesLast24h,
          last7d: salesLast7d,
          dailyTimeline,
          peakDay,
          peakCount
        },
        // Módulo Cortesias Especializado
        courtesyDetails: {
          totalCourtesies: courtesyTickets.length,
          courtesiesPercent: Number(((courtesyTickets.length / validTickets.length) * 100).toFixed(1)),
          bySector: sectorCourtesies,
          partners: courtesyPartnersList,
          timeline: courtesyTimeline
        },
        categories,
        lotes,
        utmBreakdown,
        checkin: checkinStats,
        buyersCount: buyerList.length,
        buyers: buyerList
      }
    };

    // Save to cache
    cachedData = result;
    lastCacheTime = Date.now();

    return res.status(200).json(result);
  } catch (error) {
    console.error('Dekolaê API Error:', error);
    if (cachedData) {
      res.setHeader('X-Cache-Status', 'STALE_FALLBACK');
      return res.status(200).json(cachedData);
    }
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
