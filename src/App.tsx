import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Flame, 
  Calendar, 
  Clock, 
  Users, 
  Ticket, 
  RefreshCw, 
  Share2, 
  CheckCircle2, 
  Sparkles, 
  Download,
  ShieldCheck,
  CircleDollarSign,
  Layers,
  Award,
  Radio,
  Building2,
  Newspaper,
  Coffee,
  HeartHandshake,
  Search,
  Filter,
  BarChart3,
  ExternalLink,
  Lock,
  ChevronRight
} from 'lucide-react';

interface Lote {
  dealId?: number;
  name: string;
  category?: string;
  price?: number;
  capacity: number;
  sold: number;
  remaining: number;
  percent: number;
  isSoldOut: boolean;
  isCourtesy?: boolean;
  salesChannel?: string;
  visibilities?: string[];
}

interface CategorySummary {
  name: string;
  sold: number;
  capacity: number;
  remaining: number;
  percent: number;
}

interface CourtesyPartner {
  partner: string;
  dealId: number;
  sector: string;
  subcat: string;
  count: number;
  dealChannel: string;
  qtyLimit: number;
  quotaStatus: string;
  visibilities: string[];
  lastIssued: string;
}

interface CourtesyDetails {
  totalCourtesies: number;
  courtesiesPercent: number;
  bySector: {
    'Front Stage': number;
    'Pista / Deck': number;
    'Camarote Open Bar': number;
    'Lounges': number;
  };
  partners: CourtesyPartner[];
  timeline: { date: string; count: number }[];
}

interface UtmChannel {
  channel: string;
  count: number;
  percent: number;
}

interface Buyer {
  name: string;
  email: string;
  phone: string;
  locality: string;
  dealTitle: string;
  price: number;
  isCourtesy: boolean;
  orderedAt: string;
  status: string;
}

interface DekolaeEventData {
  id: number;
  name: string;
  slug: string;
  startTime: string;
  endTime: string;
  coverUrl?: string;
  leftTicketsCount: number;
  totalRevenue: number;
  paidRevenue: number;
  ticketMedio: number;
  paidTicketsCount: number;
  freeTicketsCount: number;
  revenueLast24h: number;
  revenueLast7d: number;
  totalSold: number;
  commercialSold: number;
  courtesySold: number;
  commercialPercent: number;
  courtesyPercent: number;
  validTicketsCount: number;
  pacing: {
    last24h: number;
    last7d: number;
    dailyTimeline: { date: string; count: number }[];
    peakDay: string | null;
    peakCount: number;
  };
  courtesyDetails: CourtesyDetails;
  categories?: CategorySummary[];
  lotes: Lote[];
  utmBreakdown: UtmChannel[];
  checkin: {
    scanned: number;
    pending: number;
    totalValid: number;
    scannedPercent: number;
  };
  buyersCount: number;
  buyers: Buyer[];
}

export default function App() {
  const [eventData, setEventData] = useState<DekolaeEventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'cortesias' | 'lotes' | 'pacing' | 'canais' | 'titulares'>('cortesias');
  const [copied, setCopied] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [buyerFilter, setBuyerFilter] = useState<'all' | 'commercial' | 'courtesy'>('all');

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const autoTimer = setInterval(() => {
      fetchData(true);
    }, 60000);
    return () => clearInterval(autoTimer);
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/event-data');
      const data = await res.json();

      if (data.event) {
        setEventData(data.event);
        setLastUpdated(new Date());
        if (typeof document !== 'undefined') {
          document.title = `${data.event.name} — Live Performance & Cortesias`;
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Dekolaê:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleManualRefresh = () => {
    if (cooldown > 0 || refreshing) return;
    fetchData(true);
    setCooldown(15);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DEKOLAÊ Sunset — Live Performance & Cortesias',
          text: `Acompanhe em tempo real as vendas, cortesias e lotes do Dekolaê Sunset:`,
          url
        });
      } catch (e) {
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportCSV = () => {
    if (!eventData?.buyers || eventData.buyers.length === 0) return;

    const headers = ['Nome', 'Email', 'Telefone', 'Cidade', 'Lote', 'Tipo', 'Valor', 'Data', 'Status'];
    const rows = filteredBuyers.map(b => [
      `"${b.name.replace(/"/g, '""')}"`,
      `"${b.email.replace(/"/g, '""')}"`,
      `"${b.phone.replace(/"/g, '""')}"`,
      `"${b.locality.replace(/"/g, '""')}"`,
      `"${b.dealTitle.replace(/"/g, '""')}"`,
      b.isCourtesy ? 'CORTESIA' : 'COMERCIAL',
      `"R$ ${b.price.toFixed(2)}"`,
      `"${b.orderedAt}"`,
      `"${b.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dekolae_ingressos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtragem de titulares
  const filteredBuyers = useMemo(() => {
    if (!eventData?.buyers) return [];
    return eventData.buyers.filter(b => {
      const matchesSearch = 
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.dealTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.locality.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (buyerFilter === 'commercial') return !b.isCourtesy;
      if (buyerFilter === 'courtesy') return b.isCourtesy;
      return true;
    });
  }, [eventData?.buyers, searchQuery, buyerFilter]);

  // Ícones contextuais de parceiros
  const getPartnerIcon = (partnerName: string) => {
    const p = partnerName.toLowerCase();
    if (p.includes('shopping')) return <Building2 className="w-5 h-5 text-amber-400" />;
    if (p.includes('radio')) return <Radio className="w-5 h-5 text-sky-400" />;
    if (p.includes('imprensa')) return <Newspaper className="w-5 h-5 text-emerald-400" />;
    if (p.includes('café') || p.includes('cafe')) return <Coffee className="w-5 h-5 text-orange-400" />;
    if (p.includes('sim') || p.includes('tribuna')) return <Award className="w-5 h-5 text-purple-400" />;
    return <HeartHandshake className="w-5 h-5 text-pink-400" />;
  };

  if (loading && !eventData) {
    return (
      <div className="min-h-screen bg-[#06080B] flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
          <Flame className="w-6 h-6 text-amber-500 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-medium text-amber-400/90 tracking-wider uppercase font-mono">
          Sincronizando com Shotgun Live...
        </p>
      </div>
    );
  }

  const ev = eventData!;
  const courtesies = ev.courtesyDetails || {
    totalCourtesies: ev.courtesySold || 340,
    courtesiesPercent: ev.courtesyPercent || 32.9,
    bySector: { 'Front Stage': 142, 'Pista / Deck': 188, 'Camarote Open Bar': 0, 'Lounges': 10 },
    partners: [],
    timeline: []
  };

  return (
    <div className="min-h-screen bg-[#06080B] text-[#F3F4F6] pb-24">
      {/* Top Banner / Hero */}
      <div className="relative border-b border-white/10 bg-gradient-to-b from-[#141A23] via-[#0A0E14] to-[#06080B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-6">
          {/* Header Row: Live Status + Actions */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="text-xs font-semibold tracking-widest text-amber-400 uppercase font-mono">
                AO VIVO • SHOTGUN SMARTBOARD
              </span>
              <span className="text-xs text-white/40 hidden sm:inline">•</span>
              <span className="text-xs text-white/50 hidden sm:inline">
                Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={cooldown > 0 || refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all disabled:opacity-50"
                title="Atualizar dados do Smartboard"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
                <span>{cooldown > 0 ? `${cooldown}s` : 'Atualizar'}</span>
              </button>

              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-xs font-medium text-amber-300 transition-all shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copied ? 'Link Copiado!' : 'Compartilhar'}</span>
              </button>
            </div>
          </div>

          {/* Event Identity Card */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              {ev.coverUrl ? (
                <img 
                  src={ev.coverUrl} 
                  alt={ev.name}
                  fetchPriority="high"
                  decoding="async"
                  width={80}
                  height={80}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-amber-500/30 shadow-lg shadow-amber-500/10 shrink-0" 
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                  <Flame className="w-8 h-8 text-white" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase">
                    {ev.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Sunset 2026
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-white/60 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Domingo, 01 de Novembro de 2026
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Início: 18h00
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Paridade 1.0 Oficial
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Countdown Banner */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
              <Flame className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-amber-400 font-mono font-semibold">
                  STATUS DA OPERAÇÃO
                </div>
                <div className="text-sm font-bold text-white">
                  Contagem Regressiva: Evento neste Domingo!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-3 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Geral Emitidos */}
          <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-amber-500/30 transition-all shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
            <div className="flex items-center justify-between text-xs text-white/50 mb-1">
              <span className="uppercase font-mono tracking-wider">Total Emitidos</span>
              <Ticket className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {ev.totalSold.toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-white/60">
              <span className="text-emerald-400 font-semibold">{ev.commercialSold} pagos</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{ev.courtesySold} cortesias</span>
            </div>
          </div>

          {/* Card 2: Vendas Comerciais Pagas */}
          <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
            <div className="flex items-center justify-between text-xs text-white/50 mb-1">
              <span className="uppercase font-mono tracking-wider">Vendas Pagas</span>
              <CircleDollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {ev.commercialSold.toLocaleString('pt-BR')}
            </div>
            <div className="mt-2 text-xs text-white/60 flex items-center justify-between">
              <span>{ev.commercialPercent}% do total</span>
              <span className="text-white/40">Ticket Médio: R$ {ev.ticketMedio.toFixed(0)}</span>
            </div>
          </div>

          {/* Card 3: Cortesias & Permutas Institucionais */}
          <div className="bg-[#0D1219] border border-amber-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-md bg-gradient-to-br from-amber-500/5 to-transparent">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl transition-all" />
            <div className="flex items-center justify-between text-xs text-amber-300/80 mb-1">
              <span className="uppercase font-mono tracking-wider font-semibold">Cortesias / Permuta</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {courtesies.totalCourtesies.toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-amber-200/80 font-medium">{courtesies.courtesiesPercent}% do evento</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <Lock className="w-3 h-3" /> Blindadas
              </span>
            </div>
          </div>

          {/* Card 4: Ritmo (Pacing) */}
          <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-sky-500/30 transition-all shadow-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all" />
            <div className="flex items-center justify-between text-xs text-white/50 mb-1">
              <span className="uppercase font-mono tracking-wider">Ritmo de Emissão</span>
              <TrendingUp className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-sky-400 mt-1">
              +{ev.pacing.last24h}
            </div>
            <div className="mt-2 text-xs text-white/60">
              <span>+<b>{ev.pacing.last7d}</b> nos últimos 7 dias</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('cortesias')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'cortesias'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 font-bold'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Cortesias & Parcerias ({courtesies.totalCourtesies})</span>
          </button>

          <button
            onClick={() => setActiveTab('lotes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'lotes'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 font-bold'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Lotes & Setores</span>
          </button>

          <button
            onClick={() => setActiveTab('pacing')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'pacing'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 font-bold'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Evolução & Pacing</span>
          </button>

          <button
            onClick={() => setActiveTab('canais')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'canais'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 font-bold'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Canais & Tráfego</span>
          </button>

          <button
            onClick={() => setActiveTab('titulares')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'titulares'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 font-bold'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Base de Ingressos</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* ============================================================== */}
        {/* TAB 1: CORTESIAS & PARCERIAS INSTITUCIONAIS                    */}
        {/* ============================================================== */}
        {activeTab === 'cortesias' && (
          <div className="space-y-6">
            {/* Ocupação de Cortesias por Setor */}
            <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-md">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Distribuição de Cortesias por Setor
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Impacto direto das gratuidades na capacidade de cada setor físico
                  </p>
                </div>
                <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Total: {courtesies.totalCourtesies} ingressos
                </span>
              </div>

              {/* Grid 4 Setores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                  <div className="text-xs text-white/50 uppercase font-mono">Pista / Deck</div>
                  <div className="text-2xl font-black text-white mt-1">
                    {courtesies.bySector['Pista / Deck']}
                  </div>
                  <div className="text-xs text-amber-400 font-medium mt-1">
                    {Math.round((courtesies.bySector['Pista / Deck'] / courtesies.totalCourtesies) * 100)}% das cortesias
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                  <div className="text-xs text-white/50 uppercase font-mono">Front Stage</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {courtesies.bySector['Front Stage']}
                  </div>
                  <div className="text-xs text-amber-300 font-medium mt-1">
                    {Math.round((courtesies.bySector['Front Stage'] / courtesies.totalCourtesies) * 100)}% das cortesias
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                  <div className="text-xs text-white/50 uppercase font-mono">Lounges</div>
                  <div className="text-2xl font-black text-sky-400 mt-1">
                    {courtesies.bySector['Lounges']}
                  </div>
                  <div className="text-xs text-sky-300 font-medium mt-1">
                    Lounge 10 VIP
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                  <div className="text-xs text-white/50 uppercase font-mono">Camarote Open Bar</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    0
                  </div>
                  <div className="text-xs text-emerald-300 font-medium mt-1">
                    100% Venda Paga
                  </div>
                </div>
              </div>

              {/* Barra de Distribuição Visual */}
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden flex">
                <div 
                  style={{ width: `${(courtesies.bySector['Pista / Deck'] / courtesies.totalCourtesies) * 100}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title="Pista / Deck"
                />
                <div 
                  style={{ width: `${(courtesies.bySector['Front Stage'] / courtesies.totalCourtesies) * 100}%` }}
                  className="bg-orange-500 h-full transition-all"
                  title="Front Stage"
                />
                <div 
                  style={{ width: `${(courtesies.bySector['Lounges'] / courtesies.totalCourtesies) * 100}%` }}
                  className="bg-sky-500 h-full transition-all"
                  title="Lounges"
                />
              </div>
            </div>

            {/* Tabela Cirúrgica de Parceiros */}
            <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-md">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Detalhamento por Parceiro & Ação Institucional
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Todos os lotes de convites e parcerias com status de segurança
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Estoque Blindado (qty: 0)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {courtesies.partners.map((p, idx) => (
                  <div 
                    key={idx}
                    className="bg-white/5 border border-white/10 hover:border-amber-500/30 rounded-xl p-4 transition-all flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 shrink-0">
                        {getPartnerIcon(p.partner)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm sm:text-base flex items-center gap-2 flex-wrap">
                          <span>{p.partner}</span>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-white/10 text-white/80">
                            {p.sector}
                          </span>
                        </div>
                        <div className="text-xs text-white/50 mt-1 flex items-center gap-2 flex-wrap">
                          <span>Subcategoria: <b>{p.subcat}</b></span>
                          <span>•</span>
                          <span>Canal: <b>{p.dealChannel}</b></span>
                        </div>
                        <div className="text-[11px] text-white/40 mt-1">
                          Última emissão: {p.lastIssued ? new Date(p.lastIssued).toLocaleDateString('pt-BR') : '-'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xl sm:text-2xl font-black text-amber-400">
                        {p.count}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 justify-end mt-0.5">
                        <Lock className="w-3 h-3" /> Fechado
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Linha do Tempo de Emissão de Cortesias */}
            <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-md">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-sky-400" />
                Linha do Tempo das Emissões Institucionais
              </h3>
              <p className="text-xs text-white/50 mb-5">
                Volume de gratuidades liberadas em cada fase da campanha
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {courtesies.timeline.map((t, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <div className="text-xs text-white/40 font-mono">
                      {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="text-xl font-bold text-white mt-1">
                      {t.count}
                    </div>
                    <div className="text-[11px] text-amber-400 mt-0.5">
                      ingressos
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: TERMOÔMETRO DE LOTES & SETORES                          */}
        {/* ============================================================== */}
        {activeTab === 'lotes' && (
          <div className="space-y-6">
            {/* Categorias / Setores */}
            <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-md">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <Layers className="w-5 h-5 text-amber-400" />
                Visão por Categoria / Setor
              </h3>
              <p className="text-xs text-white/50 mb-5">
                Vendas consolidadas e percentual de lotação
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(ev.categories || []).map((cat, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between text-sm font-bold text-white mb-2">
                      <span className="truncate pr-2">{cat.name}</span>
                      <span className="text-amber-400 shrink-0">{cat.sold}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, cat.percent || 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>Capacidade: {cat.capacity || cat.sold}</span>
                      <span className="font-semibold text-white/70">{cat.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabela de Lotes Individuais */}
            <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-md">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <Ticket className="w-5 h-5 text-orange-400" />
                Termômetro de Lotes Individuais
              </h3>
              <p className="text-xs text-white/50 mb-5">
                Lotes ativos e esgotados no checkout e portaria
              </p>

              <div className="space-y-3">
                {ev.lotes.map((lote, idx) => (
                  <div 
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm sm:text-base">
                          {lote.name}
                        </span>
                        {lote.isCourtesy && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Cortesia / Permuta
                          </span>
                        )}
                        {lote.isSoldOut && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Esgotado
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/50 mt-1 flex items-center gap-2 flex-wrap">
                        <span>Setor: <b>{lote.category}</b></span>
                        <span>•</span>
                        <span>Preço: <b>{lote.price > 0 ? `R$ ${lote.price.toFixed(2)}` : 'Gratuito'}</b></span>
                        <span>•</span>
                        <span>Canal: <b>{lote.salesChannel || 'online'}</b></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:text-right">
                      <div className="w-28 sm:w-36">
                        <div className="text-xs text-white/60 mb-1 flex justify-between">
                          <span>Vendidos</span>
                          <span className="font-bold text-white">{lote.sold}/{lote.capacity}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                          <div 
                            className="bg-amber-400 h-full rounded-full"
                            style={{ width: `${lote.percent}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-bold text-amber-400 min-w-[45px] text-right">
                        {lote.percent}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: EVOLUÇÃO & PACING                                       */}
        {/* ============================================================== */}
        {activeTab === 'pacing' && (
          <div className="space-y-6">
            <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-md">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Velocidade de Vendas Diária
              </h3>
              <p className="text-xs text-white/50 mb-5">
                Histórico diário de emissão de ingressos no evento
              </p>

              <div className="space-y-2">
                {ev.pacing.dailyTimeline.slice(-14).map((day, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-white/50 w-24 shrink-0">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })}
                    </span>
                    <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden flex items-center px-2">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, (day.count / (ev.pacing.peakCount || 100)) * 100)}%` }}
                      />
                    </div>
                    <span className="font-bold text-white w-12 text-right">
                      {day.count}
                    </span>
                  </div>
                ))}
              </div>

              {ev.pacing.peakDay && (
                <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                  <span className="text-amber-200">
                    Dia de Pico da Campanha: <b>{new Date(ev.pacing.peakDay + 'T12:00:00').toLocaleDateString('pt-BR')}</b>
                  </span>
                  <span className="font-bold text-amber-400 text-sm">
                    {ev.pacing.peakCount} ingressos emitidos
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: CANAIS & TRÁFEGO (UTM)                                  */}
        {/* ============================================================== */}
        {activeTab === 'canais' && (
          <div className="space-y-6">
            <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-md">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <Share2 className="w-5 h-5 text-sky-400" />
                Origem das Vendas & Atribuição de Tráfego
              </h3>
              <p className="text-xs text-white/50 mb-5">
                Canais de aquisição de ingressos via UTMs do Shotgun Live
              </p>

              <div className="space-y-3">
                {ev.utmBreakdown.map((utm, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between text-sm font-bold text-white mb-2">
                      <span>{utm.channel}</span>
                      <span className="text-sky-400">{utm.count} ingressos ({utm.percent}%)</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-sky-400 h-full rounded-full transition-all"
                        style={{ width: `${utm.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: TITULARES & EXPORTAÇÃO CSV                             */}
        {/* ============================================================== */}
        {activeTab === 'titulares' && (
          <div className="space-y-6">
            <div className="bg-[#0D1219] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    Lista de Ingressos & Titulares
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    {filteredBuyers.length} de {ev.buyersCount} titulares encontrados
                  </p>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold hover:brightness-110 transition-all shadow-md shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar CSV Completo</span>
                </button>
              </div>

              {/* Filtros e Busca */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-white/40 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nome, email, lote ou cidade..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBuyerFilter('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      buyerFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setBuyerFilter('commercial')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      buyerFilter === 'commercial' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Pagos
                  </button>
                  <button
                    onClick={() => setBuyerFilter('courtesy')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      buyerFilter === 'courtesy' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    Cortesias
                  </button>
                </div>
              </div>

              {/* Tabela de Titulares */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-white/70">
                  <thead className="bg-white/5 text-white/50 uppercase font-mono text-[11px] border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-3">Titular</th>
                      <th className="py-2.5 px-3">Lote</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Cidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredBuyers.slice(0, 50).map((b, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-white">
                          <div>{b.name}</div>
                          <div className="text-[11px] text-white/40">{b.email}</div>
                        </td>
                        <td className="py-2.5 px-3">{b.dealTitle}</td>
                        <td className="py-2.5 px-3">
                          {b.isCourtesy ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              CORTESIA
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              R$ {b.price.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-white/50">
                          {b.orderedAt ? new Date(b.orderedAt).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-white/50">{b.locality}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredBuyers.length > 50 && (
                <div className="mt-4 text-center text-xs text-white/40">
                  Exibindo 50 de {filteredBuyers.length} registros. Use o botão <b>Exportar CSV Completo</b> para ter a relação integral.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar with Direct WhatsApp CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-[#0A0E14]/95 backdrop-blur-md border-t border-white/10 py-3 px-4 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/70 hidden sm:inline">Painel Live Oficial • Dekolaê Sunset</span>
            <span className="text-amber-400 font-semibold">{ev.totalSold} Ingressos Emitidos</span>
          </div>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all text-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Mandar ao Cliente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
