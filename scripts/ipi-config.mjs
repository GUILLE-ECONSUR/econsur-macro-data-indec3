// IPI manufacturero (INDEC, base 2004=100) · API de Series de Tiempo.
//
// ORDEN: cadena productiva, de la agroindustria y los bienes de consumo hacia los insumos industriales,
// la energía y, al final, los bienes de capital y durables (maquinaria, equipos, automotriz).
// Dentro de cada bloque: primero la división (nivel 0, en negrita) y debajo sus subclases (nivel 1),
// ordenadas de la materia prima al producto terminado. La clasificación es la del IPI del INDEC (CIIU rev.3);
// los IDs son los de la API y se pueden fijar en data/series-overrides.json con la clave de cada serie
// (la clave es el nombre en minúsculas y con guiones bajos; el build la imprime con SERIES_VERBOSE=1).
//
// Cada fila: [etiqueta, id, nivel, esDivisión]

export const TOTAL = {
  orig: '453.1_SERIE_ORIGNAL_0_0_14_46',      // nivel general, serie original
  sa: '453.1_SERIE_DESEADA_0_0_24_58',        // nivel general, desestacionalizada (oficial INDEC)
  tc: '453.1_SERIE_TENDCLO_0_0_21_61',        // nivel general, tendencia-ciclo
}

export const BLOCKS = [
  { group: '1 · Agroindustria: alimentos, bebidas y tabaco', rows: [
    ['Alimentos y bebidas', '453.2_ALIMENTOS_DAS_0_0_17_18', 0, true],
    ['Molienda de oleaginosas', '453.2_MOLIENDA_OSAS_0_0_20_8', 1],
    ['Molienda de cereales', '453.2_MOLIENDA_CLES_0_0_17_71', 1],
    ['Carne vacuna', '453.2_CARNE_VACUUNA_0_0_12_53', 1],
    ['Carne aviar', '453.2_CARNE_AVIAIAR_0_0_11_85', 1],
    ['Fiambres y embutidos', '453.2_FIAMBRES_EDOS_0_0_18_46', 1],
    ['Productos lácteos', '453.2_PRODUCTOS_EOS_0_0_17_89', 1],
    ['Preparación de frutas, hortalizas y legumbres', '453.2_PREPARACIORES_0_0_39_24', 1],
    ['Azúcar, productos de confitería y chocolate', '453.2_AZUCAR_CONATE_0_0_27_68', 1],
    ['Galletitas, productos de panadería y pastas', '453.2_GALLETITASTAS_0_0_27_88', 1],
    ['Yerba mate, té y café', '453.2_YERBA_TE_CAFE_0_0_13_44', 1],
    ['Otros productos alimenticios', '453.2_OTROS_PRODIOS_0_0_28_20', 1],
    ['Vino', '453.2_VINOINO_0_0_4_89', 1],
    ['Gaseosas, aguas, sodas, cervezas, jugos para diluir, sidras y bebidas espirituosas', '453.2_GASEOSAS_ASAS_0_0_55_90', 1],
    ['Productos de tabaco', '453.2_PRODUCTOS_ACO_0_0_16_81', 0, true],
    ['Preparación de hojas de tabaco', '453.2_PREPARACIOACO_0_0_24_1', 1],
    ['Cigarrillos', '453.2_CIGARRILLOLOS_0_0_11_16', 1],
  ] },
  { group: '2 · Textiles, indumentaria, cuero y calzado', rows: [
    ['Productos textiles', '453.2_PRODUCTOS_LES_0_0_18_32', 0, true],
    ['Preparación de fibras de uso textil', '453.2_PREPARACIOTIL_0_0_29_69', 1],
    ['Hilados de algodón', '453.2_HILADOS_ALDON_0_0_15_97', 1],
    ['Tejidos y acabado de productos textiles', '453.2_TEJIDOS_ACLES_0_0_34_1', 1],
    ['Otros productos textiles', '453.2_OTROS_PRODLES_0_0_24_67', 1],
    ['Prendas de vestir, cuero y calzado', '453.2_PRENDAS_VEADO_0_0_28_88', 0, true],
    ['Curtido y artículos de cuero, excepto prendas', '453.2_CURTIDO_ARERO_0_0_23_60', 1],
    ['Prendas de vestir', '453.2_PRENDAS_VETIR_0_0_14_10', 1],
    ['Calzado y sus partes', '453.2_CALZADOADO_0_0_7_59', 1],
  ] },
  { group: '3 · Madera, papel, edición e impresión', rows: [
    ['Madera, papel, edición e impresión', '453.2_MADERA_PAPION_0_0_30_66', 0, true],
    ['Madera y productos de madera y corcho, excepto muebles', '453.2_PRODUCTOS_CHO_0_0_23_95', 1],
    ['Papel y productos de papel', '453.2_PRODUCTOS_PEL_0_0_15_66', 1],
    ['Edición e impresión', '453.2_EDICION_IMION_0_0_17_59', 1],
  ] },
  { group: '4 · Refinación de petróleo y combustibles', rows: [
    ['Refinación del petróleo, coque y combustible nuclear', '453.2_REFINACIONEAR_0_0_45_82', 0, true],
    ['Naftas', '453.2_NAFTASTAS_0_0_6_13', 1],
    ['Gasoil', '453.2_GASOILOIL_0_0_6_78', 1],
    ['Fueloil', '453.2_FUELOILOIL_0_0_7_2', 1],
    ['Asfaltos', '453.2_ASFALTOSTOS_0_0_8_16', 1],
    ['Otros productos de la refinación del petróleo, coque y combustible nuclear', '453.2_OTROS_PRODION_0_0_26_12', 1],
  ] },
  { group: '5 · Química, caucho y plástico', rows: [
    ['Sustancias y productos químicos', '453.2_SUSTANCIASCOS_0_0_29_82', 0, true],
    ['Productos químicos básicos', '453.2_PRODUCTOS_COS_0_0_26_42', 1],
    ['Gases industriales', '453.2_GASES_INDULES_0_0_18_56', 1],
    ['Materias primas plásticas y caucho sintético', '453.2_MATERIAS_PICO_0_0_44_25', 1],
    ['Agroquímicos', '453.2_AGROQUIMICCOS_0_0_12_6', 1],
    ['Productos farmacéuticos', '453.2_PRODUCTOS_COS_0_0_23_90', 1],
    ['Detergentes, jabones y productos personales', '453.2_DETERGENTELES_0_0_40_99', 1],
    ['Pinturas', '453.2_PINTURASRAS_0_0_8_67', 1],
    ['Otros productos químicos', '453.2_OTROS_PRODCOS_0_0_24_57', 1],
    ['Productos de caucho y plástico', '453.2_PRODUCTOS_ICO_0_0_25_26', 0, true],
    ['Neumáticos', '453.2_NEUMATICOSCOS_0_0_10_63', 1],
    ['Otros productos de caucho', '453.2_OTROS_PRODCHO_0_0_22_35', 1],
    ['Manufacturas de plástico', '453.2_MANUFACTURICO_0_0_21_9', 1],
  ] },
  { group: '6 · Minerales no metálicos y materiales de construcción', rows: [
    ['Productos minerales no metálicos', '453.2_PRODUCTOS_COS_0_0_32_70', 0, true],
    ['Vidrio y productos de vidrio', '453.2_PRODUCTOS_RIO_0_0_16_39', 1],
    ['Cemento', '453.2_CEMENTONTO_0_0_7_59', 1],
    ['Cal y yeso', '453.2_CAL_YESOESO_0_0_8_92', 1],
    ['Artículos de cemento y de yeso', '453.2_ARTICULOS_ESO_0_0_22_22', 1],
    ['Productos de arcilla y cerámica no refractaria', '453.2_PRODUCTOS_ICA_0_0_26_20', 1],
    ['Otros productos minerales no metálicos', '453.2_OTROS_PRODCOS_0_0_38_93', 1],
  ] },
  { group: '7 · Metales básicos y productos de metal', rows: [
    ['Industrias metálicas básicas', '453.2_INDUSTRIASCAS_0_0_28_0', 0, true],
    ['Industria siderúrgica', '453.2_INDUSTRIA_ICA_0_0_21_100', 1],
    ['Aluminio y otros metales no ferrosos', '453.2_ALUMINIO_OSOS_0_0_34_69', 1],
    ['Fundición de metales', '453.2_FUNDICION_LES_0_0_17_29', 1],
    ['Productos de metal', '453.2_PRODUCTOS_TAL_0_0_15_15', 0, true],
    ['Productos metálicos para uso estructural', '453.2_PRODUCTOS_RAL_0_0_35_79', 1],
    ['Envases metálicos', '453.2_ENVASES_MECOS_0_0_17_38', 1],
    ['Otros productos de metal y servicios de trabajo de metales', '453.2_OTROS_PRODIOS_0_0_33_55', 1],
  ] },
  { group: '8 · Maquinaria, equipos e instrumentos (bienes de capital)', rows: [
    ['Maquinaria y equipo', '453.2_MAQUINARIAIPO_0_0_17_14', 0, true],
    ['Maquinaria de uso general', '453.2_MAQUINARIARAL_0_0_22_43', 1],
    ['Maquinaria agropecuaria', '453.2_MAQUINARIARIA_0_0_23_78', 1],
    ['Otra maquinaria de uso especial', '453.2_OTRA_MAQUIIAL_0_0_28_5', 1],
    ['Aparatos de uso doméstico', '453.2_APARATOS_UICO_0_0_22_48', 1],
    ['Otros equipos, aparatos e instrumentos', '453.2_OTROS_EQUITOS_0_0_35_77', 0, true],
    ['Equipos y aparatos eléctricos', '453.2_EQUIPOS_ELCOS_0_0_18_68', 1],
    ['Equipos y aparatos de informática, televisión y comunicaciones, y componentes electrónicos', '453.2_EQUIPOS_INCOS_0_0_70_37', 1],
    ['Instrumentos médicos, ópticos y de precisión', '453.2_INSTRUMENTION_0_0_38_2', 1],
  ] },
  { group: '9 · Industria automotriz y equipo de transporte (bienes durables)', rows: [
    ['Vehículos automotores, carrocerías, remolques y autopartes', '453.2_VEHICULOS_TES_0_0_54_37', 0, true],
    ['Vehículos automotores', '453.2_VEHICULOS_RES_0_0_21_54', 1],
    ['Carrocerías, remolques y semirremolques', '453.2_CARROCERIAUES_0_0_36_15', 1],
    ['Autopartes', '453.2_AUTOPARTESTES_0_0_10_100', 1],
    ['Otro equipo de transporte', '453.2_OTRO_EQUIPRTE_0_0_25_29', 0, true],
    ['Motocicletas', '453.2_MOTOCICLETTAS_0_0_12_50', 1],
    ['Resto equipo de transporte', '453.2_OTRO_EQUIPRTE_0_0_22_9', 1],
  ] },
  { group: '10 · Muebles, reciclado y otras manufacturas', rows: [
    ['Muebles y colchones, y otras industrias manufactureras', '453.2_MUEBLES_CORAS_0_0_49_35', 0, true],
    ['Muebles y colchones', '453.2_MUEBLES_CONES_0_0_17_98', 1],
    ['Otras industrias manufactureras', '453.2_OTRAS_INDURAS_0_0_31_41', 1],
    ['Reciclamiento y reparación, instalación y mantenimiento', '453.2_RECLICLAMINTO_0_0_51_47', 0, true],
  ] },
]
