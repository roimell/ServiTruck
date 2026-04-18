// Panamá — provincias + corregimientos principales
// Fuente: Tribunal Electoral / INEC (subset practical para marketplace)

export const PANAMA_GEO: Record<string, string[]> = {
  'Panamá': [
    'San Francisco', 'Bella Vista', 'Obarrio', 'Punta Pacífica', 'Costa del Este',
    'Clayton', 'Albrook', 'Ancón', 'Bethania', 'El Cangrejo', 'Vía España',
    'Pueblo Nuevo', 'Juan Díaz', 'Parque Lefevre', 'Río Abajo', 'Tocumen',
    'Las Cumbres', 'Chilibre', 'Pedregal', 'Curundú', 'Calidonia', 'Santa Ana',
    'El Chorrillo', '24 de Diciembre', 'Las Mañanitas', 'Pacora',
  ],
  'Panamá Oeste': [
    'La Chorrera', 'Arraiján', 'Vista Alegre', 'Burunga', 'Nuevo Emperador',
    'Veracruz', 'Capira', 'Chame', 'San Carlos', 'Coronado',
  ],
  'San Miguelito': [
    'Amelia Denis de Icaza', 'Belisario Porras', 'José Domingo Espinar',
    'Mateo Iturralde', 'Victoriano Lorenzo', 'Arnulfo Arias', 'Omar Torrijos', 'Rufina Alfaro',
  ],
  'Colón': [
    'Colón Cabecera', 'Barrio Norte', 'Barrio Sur', 'Cristóbal', 'Puerto Pilón',
    'Sabanitas', 'Cativá', 'Nuevo San Juan', 'Buena Vista', 'Portobelo', 'Chagres',
  ],
  'Coclé': [
    'Penonomé', 'Aguadulce', 'Antón', 'Natá', 'Olá', 'La Pintada', 'El Valle de Antón',
    'Río Hato', 'Farallón',
  ],
  'Chiriquí': [
    'David', 'Dolega', 'Boquete', 'Bugaba', 'Alanje', 'Barú', 'Gualaca',
    'Renacimiento', 'Tolé', 'San Lorenzo', 'Boquerón', 'Remedios',
  ],
  'Herrera': [
    'Chitré', 'Las Minas', 'Los Pozos', 'Ocú', 'Parita', 'Pesé', 'Santa María',
  ],
  'Los Santos': [
    'Las Tablas', 'Guararé', 'Los Santos Cabecera', 'Macaracas', 'Pedasí',
    'Pocrí', 'Tonosí',
  ],
  'Veraguas': [
    'Santiago', 'Atalaya', 'Calobre', 'Cañazas', 'La Mesa', 'Las Palmas',
    'Mariato', 'Montijo', 'Río de Jesús', 'San Francisco', 'Santa Fe', 'Soná',
  ],
  'Bocas del Toro': [
    'Changuinola', 'Almirante', 'Guabito', 'Chiriquí Grande', 'Bocas del Toro Cabecera',
    'Isla Colón',
  ],
  'Darién': [
    'La Palma', 'Chepigana', 'Garachiné', 'Jaqué', 'Metetí', 'Yaviza', 'Pinogana',
  ],
  'Comarca Ngäbe-Buglé': [
    'Besikó', 'Kankintú', 'Kusapín', 'Müna', 'Mironó', 'Nole Duima', 'Ñürüm', 'Santa Catalina',
  ],
  'Comarca Guna Yala': [
    'Ailigandí', 'Narganá', 'Puerto Obaldía', 'Tubualá',
  ],
  'Comarca Emberá-Wounaan': [
    'Cémaco', 'Sambú',
  ],
};

export const PROVINCIAS = Object.keys(PANAMA_GEO);

// Utilidad: dado un corregimiento, devolver provincia
export function provinciaDe(corregimiento: string): string | null {
  for (const [prov, corrs] of Object.entries(PANAMA_GEO)) {
    if (corrs.includes(corregimiento)) return prov;
  }
  return null;
}

// Lista plana de todos los corregimientos (para búsqueda/filtros)
export const TODOS_CORREGIMIENTOS = Object.values(PANAMA_GEO).flat();
