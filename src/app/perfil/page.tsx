'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import SelectorCobertura from '@/components/selector-cobertura';
import { createClient } from '@/lib/supabase';
import { TODOS_CORREGIMIENTOS, PANAMA_GEO, PROVINCIAS } from '@/lib/panama-geo';
import type { Perfil } from '@/types/database';

const IDIOMAS_OPCIONES = ['Español', 'Inglés', 'Francés', 'Portugués', 'Chino', 'Otro'];

const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

interface HorarioDia { activo: boolean; desde: string; hasta: string; }
type Horario = Record<string, HorarioDia>;

const HORARIO_DEFAULT: Horario = Object.fromEntries(
  DIAS.map((d) => [d, { activo: d !== 'Dom', desde: '08:00', hasta: '17:00' }])
);

export default function PerfilPage() {
  const supabase = createClient();
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [seccion, setSeccion] = useState<'basico' | 'profesional' | 'contacto' | 'horario' | 'cuenta'>('basico');

  // Editable fields
  const [nombre, setNombre] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [bio, setBio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [emailContacto, setEmailContacto] = useState('');
  const [corregimiento, setCorregimiento] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [cedula, setCedula] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [anosExperiencia, setAnosExperiencia] = useState('');
  const [certificaciones, setCertificaciones] = useState<string[]>([]);
  const [nuevaCert, setNuevaCert] = useState('');
  const [idiomas, setIdiomas] = useState<string[]>([]);
  const [ruc, setRuc] = useState('');
  const [areaCobertura, setAreaCobertura] = useState<string[]>([]);
  const [horario, setHorario] = useState<Horario>(HORARIO_DEFAULT);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const { data } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setPerfil(data);
        setNombre(data.nombre || '');
        setNombreComercial(data.nombre_comercial || '');
        setBio(data.bio || '');
        setTelefono(data.telefono || '');
        setWhatsapp(data.whatsapp || '');
        setEmailContacto(data.email_contacto || '');
        setCorregimiento(data.corregimiento || '');
        setFechaNacimiento(data.fecha_nacimiento || '');
        setCedula(data.cedula || '');
        setSitioWeb(data.sitio_web || '');
        setInstagram(data.instagram || '');
        setFacebook(data.facebook || '');
        setTiktok(data.tiktok || '');
        setAnosExperiencia(data.anos_experiencia?.toString() || '');
        setCertificaciones(data.certificaciones || []);
        setIdiomas(data.idiomas || []);
        setRuc(data.ruc || '');
        setAreaCobertura(data.area_cobertura || []);
        setHorario((data.horario_atencion as Horario) || HORARIO_DEFAULT);
        setAvatarUrl(data.avatar_url);
      }
      setCargando(false);
    })();
  }, []);

  async function subirAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !perfil) return;
    if (file.size > 5 * 1024 * 1024) { setErr('Imagen muy grande (máx 5MB)'); return; }

    setSubiendoAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `${perfil.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { setErr('Error subiendo imagen'); setSubiendoAvatar(false); return; }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    setSubiendoAvatar(false);
    setOk('Foto actualizada');
  }

  async function guardar() {
    if (!perfil) return;
    setGuardando(true);
    setErr(null);
    setOk(null);

    const { error } = await supabase
      .from('perfiles')
      .update({
        nombre: nombre.trim() || null,
        nombre_comercial: nombreComercial.trim() || null,
        bio: bio.trim() || null,
        telefono: telefono.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email_contacto: emailContacto.trim() || null,
        corregimiento: corregimiento || null,
        fecha_nacimiento: fechaNacimiento || null,
        cedula: cedula.trim() || null,
        sitio_web: sitioWeb.trim() || null,
        instagram: instagram.trim() || null,
        facebook: facebook.trim() || null,
        tiktok: tiktok.trim() || null,
        anos_experiencia: anosExperiencia ? parseInt(anosExperiencia) : null,
        certificaciones,
        idiomas,
        ruc: ruc.trim() || null,
        area_cobertura: areaCobertura,
        horario_atencion: horario,
        avatar_url: avatarUrl,
      })
      .eq('id', perfil.id);

    setGuardando(false);
    if (error) setErr(error.message);
    else {
      setOk('Perfil guardado');
      setTimeout(() => setOk(null), 2500);
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-[var(--color-warm-bg)]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center text-stone-400">Cargando perfil...</div>
      </div>
    );
  }

  if (!perfil) return null;

  const esProv = perfil.es_proveedor;
  type SeccionId = 'basico' | 'profesional' | 'contacto' | 'horario' | 'cuenta';
  const secciones: { id: SeccionId; label: string; icon: string }[] = [
    { id: 'basico', label: 'Datos básicos', icon: '👤' },
    ...(esProv ? [{ id: 'profesional' as const, label: 'Perfil profesional', icon: '💼' }] : []),
    { id: 'contacto', label: 'Contacto y redes', icon: '📞' },
    ...(esProv ? [{ id: 'horario' as const, label: 'Horario y cobertura', icon: '🗓️' }] : []),
    { id: 'cuenta', label: 'Cuenta', icon: '⚙️' },
  ];

  // Completeness indicator
  const camposTotales = esProv ? 14 : 8;
  const camposLlenos = [
    nombre, bio, telefono, corregimiento, avatarUrl, fechaNacimiento, cedula, emailContacto,
    ...(esProv ? [nombreComercial, whatsapp, anosExperiencia, certificaciones.length ? 'x' : '', idiomas.length ? 'x' : '', areaCobertura.length ? 'x' : ''] : []),
  ].filter(Boolean).length;
  const pctCompleto = Math.round((camposLlenos / camposTotales) * 100);

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-stone-400 hover:text-stone-600">← Inicio</Link>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mt-2">Mi Perfil</h1>
          <p className="text-stone-500 mt-1 text-sm">Entre más completo tu perfil, más confianza transmites.</p>
        </div>

        {/* Completeness bar */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-stone-700">Perfil completo</p>
            <span className="text-sm font-bold text-teal-600">{pctCompleto}%</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all"
              style={{ width: `${pctCompleto}%` }}
            />
          </div>
          {perfil.verificado && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Proveedor verificado
            </div>
          )}
          {!perfil.activo && (
            <div className="mt-3 text-xs text-red-700 bg-red-50 px-2.5 py-1.5 rounded-lg">
              ⚠️ Cuenta desactivada: {perfil.desactivado_motivo || 'contacta soporte'}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          {/* Sidebar nav */}
          <aside className="space-y-1">
            {secciones.map((s) => (
              <button
                key={s.id}
                onClick={() => setSeccion(s.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2.5 ${
                  seccion === s.id ? 'bg-teal-600 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </aside>

          {/* Content */}
          <section className="bg-white rounded-2xl border border-stone-200/80 p-6 md:p-8">
            {/* ─── BÁSICO ─── */}
            {seccion === 'basico' && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-bold text-stone-900">Datos básicos</h2>

                {/* Avatar */}
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                    {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : nombre[0]?.toUpperCase()}
                  </div>
                  <div>
                    <label className="btn-ghost text-sm cursor-pointer">
                      {subiendoAvatar ? 'Subiendo...' : 'Cambiar foto'}
                      <input type="file" accept="image/*" onChange={subirAvatar} className="hidden" disabled={subiendoAvatar} />
                    </label>
                    <p className="text-xs text-stone-400 mt-1">JPG o PNG, máx 5MB</p>
                  </div>
                </div>

                <Campo label="Nombre completo *" valor={nombre} onChange={setNombre} />
                <Campo label="Biografía / Sobre mí" valor={bio} onChange={setBio} textarea placeholder="Cuéntanos sobre ti, tu experiencia y lo que te distingue..." maxLength={500} />
                <div className="grid md:grid-cols-2 gap-4">
                  <Campo label="Fecha de nacimiento" valor={fechaNacimiento} onChange={setFechaNacimiento} type="date" />
                  <Campo label="Cédula" valor={cedula} onChange={setCedula} placeholder="8-888-8888" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Corregimiento donde resides *</label>
                  <select value={corregimiento} onChange={(e) => setCorregimiento(e.target.value)} className="input">
                    <option value="">Selecciona provincia y corregimiento...</option>
                    {PROVINCIAS.map((prov) => (
                      <optgroup key={prov} label={prov}>
                        {PANAMA_GEO[prov].map((c) => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ─── PROFESIONAL ─── */}
            {seccion === 'profesional' && esProv && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-bold text-stone-900">Perfil profesional</h2>

                <Campo label="Nombre comercial / Empresa" valor={nombreComercial} onChange={setNombreComercial} placeholder="Ej: Electricidad RM" />
                <div className="grid md:grid-cols-2 gap-4">
                  <Campo label="Años de experiencia" valor={anosExperiencia} onChange={setAnosExperiencia} type="number" placeholder="5" />
                  <Campo label="RUC" valor={ruc} onChange={setRuc} placeholder="8-888-8888 DV 88" />
                </div>

                {/* Certificaciones */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Certificaciones / Licencias</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {certificaciones.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs font-medium px-3 py-1.5 rounded-full">
                        {c}
                        <button onClick={() => setCertificaciones(certificaciones.filter((_, j) => j !== i))} className="hover:text-red-600">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={nuevaCert} onChange={(e) => setNuevaCert(e.target.value)} placeholder="Ej: Electricista certificado CPR" className="input flex-1" />
                    <button
                      onClick={() => { if (nuevaCert.trim()) { setCertificaciones([...certificaciones, nuevaCert.trim()]); setNuevaCert(''); } }}
                      className="btn-primary text-sm !px-4"
                    >
                      Añadir
                    </button>
                  </div>
                </div>

                {/* Idiomas */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Idiomas que hablas</label>
                  <div className="flex flex-wrap gap-2">
                    {IDIOMAS_OPCIONES.map((i) => {
                      const sel = idiomas.includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => setIdiomas(sel ? idiomas.filter((x) => x !== i) : [...idiomas, i])}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            sel ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── CONTACTO ─── */}
            {seccion === 'contacto' && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-bold text-stone-900">Contacto y redes</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <Campo label="Teléfono principal" valor={telefono} onChange={setTelefono} placeholder="+507 ..." />
                  <Campo label="WhatsApp" valor={whatsapp} onChange={setWhatsapp} placeholder="+507 ..." />
                </div>
                <Campo label="Email de contacto" valor={emailContacto} onChange={setEmailContacto} type="email" placeholder="contacto@..." />
                <div className="grid md:grid-cols-2 gap-4">
                  <Campo label="Sitio web" valor={sitioWeb} onChange={setSitioWeb} placeholder="https://..." />
                  <Campo label="Instagram" valor={instagram} onChange={setInstagram} placeholder="@usuario" />
                  <Campo label="Facebook" valor={facebook} onChange={setFacebook} placeholder="facebook.com/..." />
                  <Campo label="TikTok" valor={tiktok} onChange={setTiktok} placeholder="@usuario" />
                </div>
              </div>
            )}

            {/* ─── HORARIO + COBERTURA ─── */}
            {seccion === 'horario' && esProv && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-bold text-stone-900">Horario y cobertura</h2>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-3">Horario de atención</label>
                  <div className="space-y-2">
                    {DIAS.map((d) => {
                      const h = horario[d];
                      return (
                        <div key={d} className="flex items-center gap-3 py-1.5">
                          <label className="flex items-center gap-2 w-24">
                            <input
                              type="checkbox"
                              checked={h.activo}
                              onChange={(e) => setHorario({ ...horario, [d]: { ...h, activo: e.target.checked } })}
                              className="w-4 h-4 accent-teal-600"
                            />
                            <span className="text-sm font-medium text-stone-700">{d}</span>
                          </label>
                          {h.activo && (
                            <>
                              <input type="time" value={h.desde} onChange={(e) => setHorario({ ...horario, [d]: { ...h, desde: e.target.value } })} className="input !py-1.5 !text-sm" />
                              <span className="text-stone-400 text-sm">a</span>
                              <input type="time" value={h.hasta} onChange={(e) => setHorario({ ...horario, [d]: { ...h, hasta: e.target.value } })} className="input !py-1.5 !text-sm" />
                            </>
                          )}
                          {!h.activo && <span className="text-sm text-stone-400 italic">Cerrado</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Áreas que cubres</label>
                  <SelectorCobertura
                    seleccionados={areaCobertura}
                    onChange={setAreaCobertura}
                    ayuda="Elige provincia → luego corregimientos. O selecciona la provincia completa de un toque."
                  />
                </div>
              </div>
            )}

            {/* ─── CUENTA ─── */}
            {seccion === 'cuenta' && (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-bold text-stone-900">Cuenta</h2>

                <div className="bg-stone-50 rounded-xl p-4">
                  <p className="text-xs text-stone-400 uppercase tracking-wide font-medium">Tipo de usuario</p>
                  <p className="text-sm font-medium text-stone-800 mt-1">{perfil.es_proveedor ? 'Proveedor' : 'Cliente'}</p>
                </div>

                {!perfil.es_proveedor && (
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                    <p className="text-sm font-medium text-teal-900 mb-1">¿Quieres ofrecer servicios?</p>
                    <p className="text-xs text-teal-700 mb-3">Contacta soporte para convertir tu cuenta en cuenta de proveedor.</p>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-sm font-medium text-amber-900 mb-1">Verificación</p>
                  <p className="text-xs text-amber-700">
                    {perfil.verificado
                      ? '✓ Tu perfil está verificado por el equipo de ServiTrust.'
                      : 'Completa tu perfil al 100% para ser elegible para verificación manual por nuestro equipo.'}
                  </p>
                </div>

                <button
                  onClick={async () => {
                    if (!confirm('¿Seguro que quieres cerrar sesión?')) return;
                    await supabase.auth.signOut();
                    router.push('/');
                  }}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Cerrar sesión
                </button>
              </div>
            )}

            {/* Sticky save */}
            <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between gap-3">
              <div className="text-sm">
                {err && <span className="text-red-600">{err}</span>}
                {ok && <span className="text-teal-600 font-medium">✓ {ok}</span>}
              </div>
              <button
                onClick={guardar}
                disabled={guardando}
                className="btn-primary"
              >
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Campo({
  label, valor, onChange, placeholder, type = 'text', textarea, maxLength,
}: {
  label: string; valor: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; textarea?: boolean; maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">{label}</label>
      {textarea ? (
        <textarea
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={4}
          className="input resize-none"
        />
      ) : (
        <input
          type={type}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input"
        />
      )}
      {maxLength && textarea && (
        <p className="text-xs text-stone-400 mt-1">{valor.length}/{maxLength}</p>
      )}
    </div>
  );
}
