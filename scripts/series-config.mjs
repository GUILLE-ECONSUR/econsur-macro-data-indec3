// Catálogo de series históricas (API de Series de Tiempo, datos.gob.ar).
//
// Cada indicador se resuelve en este orden:
//   1) data/series-overrides.json  → { "clave": "ID_DE_SERIE" }   (lo que fijes a mano manda)
//   2) `ids`   → IDs candidatos conocidos
//   3) `search`→ búsqueda por texto en /search (q + filtros match/not)
//
// freq : frecuencia NATIVA de la serie ('M' mensual → se agrega a trimestre; 'T' trimestral)
// agg  : cómo se agrega un mes a trimestre: 'avg' promedio, 'sum' suma, 'eop' fin de período
// type : 'idx'    → niveles; variaciones en %            (índices, montos)
//        'rate'   → tasas en %; variaciones en p.p.      (desocupación, UCII...)
//        'signed' → puede ser negativa; variación absoluta (saldos, cuenta corriente)
// sa   : true si la serie está desestacionalizada (la var. trimestral solo es limpia en ese caso)
const S = (key, label, group, unit, type, freq, agg, extra = {}) => ({ key, label, group, unit, type, freq, agg, sa: false, ...extra })

export const SERIES = [
  // ───────── Actividad ─────────
  S('pib', 'Producto interno bruto (PIB)', 'Actividad', 'millones de $ de 2004', 'idx', 'T', 'avg', { sa: true,
    search: { q: 'PIB precios de mercado desestacionalizado', match: /(producto interno bruto|pib)/i, not: /per c|variaci|deflactor|corriente|%/i } }),
  S('consumo_priv', 'Consumo privado', 'Actividad', 'millones de $ de 2004', 'idx', 'T', 'avg', {
    ids: ['4.2_MGCP_2004_T_25'], unitsMatch: /2004|constantes/i }),
  S('consumo_pub', 'Consumo público', 'Actividad', 'millones de $ de 2004', 'idx', 'T', 'avg', {
    ids: ['4.2_DGCP_2004_T_30'], unitsMatch: /2004|constantes/i }),
  S('consumo', 'Consumo total (privado + público)', 'Actividad', 'millones de $ de 2004', 'idx', 'T', 'avg', {
    derive: { a: 'consumo_priv', b: 'consumo_pub', op: 'add' } }),
  S('fbcf', 'Formación bruta de capital fijo', 'Actividad', 'millones de $ de 2004', 'idx', 'T', 'avg', {
    ids: ['166.2_F_BRUTAIJO_0_0_19'], unitsMatch: /2004|constantes/i,
    search: { q: 'formación bruta de capital fijo desestacionalizado', match: /formaci[oó]n bruta de capital fijo/i, not: /variaci|corriente|%/i } }),
  S('emae', 'EMAE (desest.)', 'Actividad', 'índice 2004=100', 'idx', 'M', 'avg', { sa: true,
    ids: ['143.3_NO_PR_2004_A_31'] }),
  S('emae_orig', 'EMAE (serie original)', 'Actividad', 'índice 2004=100', 'idx', 'M', 'avg', {
    ids: ['143.3_NO_PR_2004_A_21'] }),
  S('ucii', 'Utilización de la capacidad instalada (UCII)', 'Actividad', '%', 'rate', 'M', 'avg', {
    search: { q: 'utilización capacidad instalada industria manufacturera', match: /capacidad instalada/i, not: /bloque|rubro|sector/i } }),
  S('ipi', 'IPI manufacturero', 'Actividad', 'índice base 2004=100', 'idx', 'M', 'avg', {
    ids: ['453.1_SERIE_ORIGNAL_0_0_14_46'],
    search: { q: 'IPI manufacturero nivel general', match: /(ipi|producci[oó]n industrial).*(nivel general|manufacturero)|nivel general/i, not: /variaci|desestacion/i } }),
  S('isac', 'Indicador sintético de la construcción (ISAC)', 'Actividad', 'índice', 'idx', 'M', 'avg', {
    ids: ['33.2_ISAC_NIVELRAL_0_M_18_63'],
    search: { q: 'indicador sintético actividad construcción ISAC', match: /(isac|actividad de la construcci[oó]n)/i, not: /variaci|insumo|desestacion/i } }),
  S('super', 'Ventas en supermercados (a precios constantes)', 'Actividad', 'millones de $', 'idx', 'M', 'sum', {
    ids: ['455.1_VENTAS_PRETES_0_M_25_98'],
    search: { q: 'supermercados ventas totales precios constantes', match: /supermercados/i, not: /variaci|corrientes|bocas|ticket/i } }),
  S('mayoristas', 'Ventas en autoservicios mayoristas (a precios constantes)', 'Actividad', 'millones de $', 'idx', 'M', 'sum', {
    ids: ['456.1_VENTAS_PRETES_0_M_25_67'] }),
  S('centros', 'Ventas en centros de compras (a precios constantes)', 'Actividad', 'millones de $', 'idx', 'M', 'sum', {
    ids: ['458.1_VENTAS_TOTTES_ABRI_M_33_40'],
    search: { q: 'centros de compras ventas totales precios constantes', match: /centros de compras/i, not: /variaci|corrientes/i } }),

  // ───────── Precios y canastas (fin de período) ─────────
  S('ipc', 'IPC nivel general', 'Precios y canastas', 'índice dic-2016=100', 'idx', 'M', 'eop', {
    ids: ['148.3_INIVELNAL_DICI_M_26'],
    search: { q: 'IPC nacional nivel general índice diciembre 2016', match: /nivel general/i, not: /variaci|regi[oó]n|gba|noa|nea|cuyo|pampeana|patagonia|%/i } }),
  S('ipc_nucleo', 'IPC núcleo', 'Precios y canastas', 'índice dic-2016=100', 'idx', 'M', 'eop', {
    ids: ['148.3_INUCLEONAL_DICI_M_19'] }),
  S('ipc_regulados', 'IPC regulados', 'Precios y canastas', 'índice dic-2016=100', 'idx', 'M', 'eop', {
    ids: ['148.3_IREGULANAL_DICI_M_22'] }),
  S('ipc_estacionales', 'IPC estacionales', 'Precios y canastas', 'índice dic-2016=100', 'idx', 'M', 'eop', {
    ids: ['148.1_IPC_ESTACINAL_DICI_T_25'] }),
  S('ipc_bienes', 'IPC bienes', 'Precios y canastas', 'índice dic-2016=100', 'idx', 'M', 'eop', {
    ids: ['147.3_IBIENESNAL_DICI_T_19'] }),
  S('ipc_servicios', 'IPC servicios', 'Precios y canastas', 'índice dic-2016=100', 'idx', 'M', 'eop', {
    ids: ['147.3_ISERVICNAL_DICI_T_22'] }),
  S('ipc_alim', 'IPC alimentos y bebidas no alcohólicas', 'Precios y canastas', 'índice dic-2016=100', 'idx', 'M', 'eop', {
    search: { q: 'IPC nacional alimentos y bebidas no alcohólicas nivel nacional', match: /alimentos y bebidas/i, not: /variaci|regi[oó]n|gba|noa|nea|cuyo|pampeana|patagonia/i } }),
  S('icc', 'Índice del costo de la construcción (ICC)', 'Precios y canastas', 'índice', 'idx', 'M', 'eop', {
    search: { q: 'índice costo de la construcción nivel general', match: /costo de la construcci[oó]n/i, not: /variaci|mano de obra|materiales|gastos/i } }),
  S('ipim', 'Precios internos al por mayor (IPIM)', 'Precios y canastas', 'índice', 'idx', 'M', 'eop', {
    ids: ['448.1_NIVEL_GENERAL_0_0_13_46'],
    search: { q: 'índice de precios internos al por mayor nivel general', match: /internos al por mayor/i, not: /variaci|b[aá]sicos|productos/i } }),
  S('cba', 'Canasta básica alimentaria (CBA)', 'Precios y canastas', '$ por adulto equivalente', 'idx', 'M', 'eop', {
    search: { q: 'canasta básica alimentaria adulto equivalente', match: /canasta b[aá]sica alimentaria/i, not: /variaci|regi[oó]n|gba|noa|nea/i } }),
  S('lp', 'Línea de pobreza', 'Precios y canastas', '$ por adulto equivalente', 'idx', 'D', 'eop', {
    ids: ['150.1_LA_POBREZA_0_D_13'] }),
  S('cbt', 'Canasta básica total (CBT)', 'Precios y canastas', '$ por adulto equivalente', 'idx', 'M', 'eop', {
    search: { q: 'canasta básica total adulto equivalente', match: /canasta b[aá]sica total/i, not: /variaci|regi[oó]n|gba|noa|nea/i } }),

  // ───────── Salarios ─────────
  S('salarios', 'Índice de salarios (nivel general)', 'Salarios', 'índice oct-2016=100', 'idx', 'M', 'eop', {
    ids: ['149.1_TL_INDIIOS_OCTU_0_21'],
    search: { q: 'índice de salarios nivel general', match: /salarios.*(nivel general|total)|nivel general/i, not: /variaci|registrado|no registrado|p[uú]blico|privado/i } }),

  S('sal_reg', 'Salarios: empleo registrado', 'Salarios', 'índice oct-2016=100', 'idx', 'M', 'eop', {
    ids: ['149.1_TL_REGIADO_OCTU_0_16'] }),
  S('sal_priv', 'Salarios: registrado sector privado', 'Salarios', 'índice oct-2016=100', 'idx', 'M', 'eop', {
    ids: ['149.1_SOR_PRIADO_OCTU_0_25'] }),
  S('sal_pub', 'Salarios: registrado sector público', 'Salarios', 'índice oct-2016=100', 'idx', 'M', 'eop', {
    ids: ['149.1_SOR_PUBICO_OCTU_0_14'] }),
  S('sal_noreg', 'Salarios: no registrado sector privado', 'Salarios', 'índice oct-2016=100', 'idx', 'M', 'eop', {
    ids: ['149.1_SOR_PRIADO_OCTU_0_28'] }),

  S('rem_sipa', 'Remuneración bruta promedio, asalariados registrados privados', 'Salarios', '$ corrientes', 'idx', 'M', 'avg', {
    ids: ['157.1_TLTAL_C_0_0_5'] }),
  S('rem_sipa_sa', 'Remuneración bruta promedio, asal. reg. privados (desest.)', 'Salarios', '$ corrientes', 'idx', 'M', 'avg', { sa: true,
    ids: ['157.2_TLTAL_S_0_0_5'] }),

  // ───────── Sector externo ─────────
  S('expo', 'Exportaciones FOB', 'Sector externo', 'millones de US$', 'idx', 'M', 'sum', {
    ids: ['74.3_IET_0_M_16'] }),
  S('impo', 'Importaciones CIF', 'Sector externo', 'millones de US$', 'idx', 'M', 'sum', {
    ids: ['74.3_IIT_0_M_25'] }),
  S('saldo', 'Saldo comercial', 'Sector externo', 'millones de US$', 'signed', 'M', 'sum', {
    ids: ['74.3_ISC_0_M_19'], derive: { a: 'expo', b: 'impo' } }),
  S('cc', 'Cuenta corriente (balanza de pagos)', 'Sector externo', 'millones de US$', 'signed', 'T', 'sum', {
    ids: ['160.2_TL_CUENNTE_0_T_22'],
    search: { q: 'balanza de pagos cuenta corriente', match: /cuenta corriente/i, not: /pib|%|primario|secundario|servicios|bienes|ingreso/i } }),
  S('tot', 'Términos del intercambio', 'Sector externo', 'índice', 'idx', 'T', 'avg', {
    ids: ['82.2_ITI_2004_T_27'],
    search: { q: 'términos del intercambio', match: /t[eé]rminos del intercambio/i, not: /variaci/i } }),
  S('deuda', 'Deuda externa total', 'Sector externo', 'millones de US$ (fin de trimestre)', 'idx', 'T', 'eop', {
    ids: ['161.1_TL_DEUDRNA_0_0_19'] }),
  S('deuda_gg', 'Deuda del gobierno general', 'Sector externo', 'millones de US$ (fin de trimestre)', 'idx', 'T', 'eop', {
    ids: ['161.1_TL_DEUDRAL_0_0_28'] }),

  // ───────── Empleo y distribución (EPH, Cuentas nacionales) ─────────
  S('actividad', 'Tasa de actividad', 'Empleo e ingresos', '% de la población', 'rate', 'T', 'avg', {
    ids: ['45.2_ECTAT_0_T_30'],
    search: { q: 'tasa de actividad EPH continua total aglomerados urbanos', match: /actividad/i, not: /var|sexo|edad|var[oó]n|mujer/i } }),
  S('empleo', 'Tasa de empleo', 'Empleo e ingresos', '% de la población', 'rate', 'T', 'avg', {
    ids: ['45.2_ECTET_0_T_30'],
    search: { q: 'tasa de empleo EPH continua total aglomerados urbanos', match: /empleo/i, not: /var|sexo|edad|var[oó]n|mujer|[ií]ndice/i } }),
  S('desocupacion', 'Tasa de desocupación', 'Empleo e ingresos', '% de la PEA', 'rate', 'T', 'avg', {
    ids: ['45.2_ECTDT_0_T_33'],
    search: { q: 'tasa de desocupación EPH continua total aglomerados urbanos', match: /desocupaci[oó]n/i, not: /var|sexo|edad|var[oó]n|mujer/i } }),
  S('subocupacion', 'Tasa de subocupación', 'Empleo e ingresos', '% de la PEA', 'rate', 'T', 'avg', {
    search: { q: 'tasa de subocupación EPH total aglomerados', match: /subocupaci[oó]n/i, not: /demandante|no demandante|var/i } }),
  S('remuneracion', 'Remuneración del trabajo asalariado (total economía)', 'Empleo e ingresos', 'millones de $', 'idx', 'T', 'sum', {
    ids: ['53.1_TRTA_0_0_37'] }),
  S('puestos', 'Puestos de trabajo totales', 'Empleo e ingresos', 'miles', 'idx', 'T', 'avg', {
    search: { q: 'puestos de trabajo totales cuentas nacionales', match: /puestos de trabajo/i, not: /variaci|asalariados|no asalariados|sector/i } }),
  S('gini', 'Coeficiente de Gini (ingreso per cápita familiar)', 'Empleo e ingresos', 'índice 0-1', 'signed', 'T', 'avg', {
    search: { q: 'coeficiente de Gini ingreso per cápita familiar EPH', match: /gini/i, not: /decil|var/i } }),

  // ───────── Servicios y turismo ─────────
  S('issp', 'Indicador sintético de servicios públicos (ISSP)', 'Servicios y turismo', 'índice', 'idx', 'M', 'avg', {
    search: { q: 'indicador sintético servicios públicos ISSP', match: /servicios p[uú]blicos/i, not: /variaci|desestacion|transporte|comunicaci|electricidad|gas|agua/i } }),
  S('tur_emi', 'Turismo emisivo', 'Servicios y turismo', 'miles de turistas', 'idx', 'M', 'sum', {
    search: { q: 'encuesta de turismo internacional turismo emisivo turistas', match: /emisivo/i, not: /variaci|gasto|pernocta|estad[ií]a/i } }),
  S('tur_rec', 'Turismo receptivo', 'Servicios y turismo', 'miles de turistas', 'idx', 'M', 'sum', {
    search: { q: 'encuesta de turismo internacional turismo receptivo turistas', match: /receptivo/i, not: /variaci|gasto|pernocta|estad[ií]a/i } }),
  S('pernoc', 'Pernoctaciones en hoteles', 'Servicios y turismo', 'miles de noches', 'idx', 'M', 'sum', {
    search: { q: 'encuesta de ocupación hotelera pernoctaciones total', match: /pernoctaciones/i, not: /variaci|residentes|no residentes|regi[oó]n/i } }),
  S('viajeros', 'Viajeros hospedados', 'Servicios y turismo', 'miles', 'idx', 'M', 'sum', {
    search: { q: 'encuesta de ocupación hotelera viajeros hospedados total', match: /viajeros/i, not: /variaci|residentes|no residentes|regi[oó]n/i } }),

  // ───────── Balance cambiario (BCRA, dataset 182.1) · flujos mensuales sumados por trimestre ─────────
  S('bc_bienes', 'Bienes (total)', 'Cuenta corriente cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 0,
    ids: ['182.1_CUENTA_CORNES_0_M_39'] }),
  S('bc_servicios', 'Servicios (total)', 'Cuenta corriente cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 0,
    ids: ['182.1_CUENTA_CORIOS_0_M_42'] }),
  S('bc_serv_egr', 'Servicios: egresos', 'Cuenta corriente cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 1,
    ids: ['182.1_CUENTA_COROS_0_M_45'] }),
  S('bc_prim', 'Ingreso primario: utilidades, dividendos y otras rentas', 'Cuenta corriente cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 0,
    ids: ['182.1_C_CORR_INGTAS_0_M_57'] }),
  S('bc_sec', 'Ingreso secundario', 'Cuenta corriente cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 0,
    ids: ['182.1_CUENTA_CORRIO_0_M_45'] }),
  S('bc_k_total', 'Total cuenta capital y financiera cambiaria', 'Cuenta capital y financiera cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 0,
    ids: ['182.1_TOTAL_CUENRIA_0_M_41'] }),
  S('faext', 'Formación de activos externos del sector privado no financiero (total)', 'Cuenta capital y financiera cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 1,
    ids: ['182.1_C_K_FINC_CINC_0_M_56'] }),
  S('bc_fae_fin', 'Formación de activos externos del sector financiero (PGC)', 'Cuenta capital y financiera cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 1,
    ids: ['182.1_C_CAP_FINAGC_0_M_56'] }),
  S('bc_portafolio', 'Inversión de portafolio de no residentes (total)', 'Cuenta capital y financiera cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 1,
    ids: ['182.1_C_K_FINC_CTES_0_M_50'] }),
  S('bc_prestamos', 'Préstamos financieros, títulos de deuda y líneas de crédito (total)', 'Cuenta capital y financiera cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 1,
    ids: ['182.1_C_K_FINC_CRED_0_M_52'] }),
  S('bc_oi', 'Préstamos de otros organismos internacionales y bilaterales (egresos)', 'Cuenta capital y financiera cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 1,
    ids: ['182.1_C_K_FINC_CLAT_BI_0_M_55'] }),
  S('bc_sp', 'Otras operaciones del sector público (neto)', 'Cuenta capital y financiera cambiaria', 'millones de US$', 'signed', 'M', 'sum', { tab: 'balance', indent: 1,
    ids: ['182.1_C_CAP_FINATO_0_M_54'] }),
]
