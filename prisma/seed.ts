import { PrismaClient, RegimenFiscal, UserRole, AccountType, EstadoDocumento, TipoDocumentoFEL, TipoMovimiento, RulePriority, AuditAction, PeriodoEstado, EmpresaRol, EntryType, EntryStatus, EntrySource } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de ContaGT...');

  // ============================================
  // USUARIOS BASE
  // ============================================
  const passwordHash = await bcrypt.hash('ContaGT2025!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@contagt.gt' },
    update: {},
    create: {
      email: 'admin@contagt.gt',
      name: 'Administrador ContaGT',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      emailVerified: new Date(),
    },
  });

  const contador = await prisma.user.upsert({
    where: { email: 'contador@demo.gt' },
    update: {},
    create: {
      email: 'contador@demo.gt',
      name: 'Juan Pérez (Contador)',
      passwordHash,
      role: UserRole.CONTADOR,
      emailVerified: new Date(),
    },
  });

  const auditor = await prisma.user.upsert({
    where: { email: 'auditor@demo.gt' },
    update: {},
    create: {
      email: 'auditor@demo.gt',
      name: 'María López (Auditora)',
      passwordHash,
      role: UserRole.AUDITOR,
      emailVerified: new Date(),
    },
  });

  console.log('✅ Usuarios creados');

  // ============================================
  // EMPRESA DEMO - Agencia de Publicidad
  // ============================================
  const empresa = await prisma.empresa.upsert({
    where: { nit: '12345678-9' },
    update: {},
    create: {
      nombre: 'Publicidad Creativa S.A.',
      nit: '12345678-9',
      nombreComercial: 'Creativa Ads',
      direccion: '15 Avenida 10-50 Zona 10, Edificio Torre Azul, Nivel 8',
      municipio: 'Guatemala',
      departamento: 'Guatemala',
      telefono: '+502 2367-8900',
      email: 'contabilidad@creativaads.gt',
      regimenFiscal: RegimenFiscal.GENERAL,
      esAgenteRetenedor: true,
      activa: true,
      usuarios: {
        create: [
          { userId: admin.id, rol: EmpresaRol.DUENO, activo: true },
          { userId: contador.id, rol: EmpresaRol.CONTADOR, activo: true },
          { userId: auditor.id, rol: EmpresaRol.AUDITOR, activo: true },
        ],
      },
    },
  });

  console.log('✅ Empresa demo creada');

  // ============================================
  // PERÍODOS 2025
  // ============================================
  for (let mes = 1; mes <= 12; mes++) {
    await prisma.periodo.upsert({
      where: {
        empresaId_año_mes: {
          empresaId: empresa.id,
          año: 2025,
          mes,
        },
      },
      update: {},
      create: {
        empresaId: empresa.id,
        año: 2025,
        mes,
        estado: mes <= 7 ? PeriodoEstado.CERRADO : PeriodoEstado.ABIERTO,
        cerradoEn: mes <= 7 ? new Date(2025, mes, 15) : null,
        cerradoPor: mes <= 7 ? contador.id : null,
      },
    });
  }
  console.log('✅ Períodos 2025 creados');

  // ============================================
  // CATÁLOGO DE CUENTAS - Plan Contable Guatemala (SAT/NIIF PYMES)
  // ============================================
  const cuentas = [
    // ACTIVOS
    { code: '1101', name: 'Caja y Bancos', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1102', name: 'Caja Chica', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1201', name: 'Cuentas por Cobrar - Clientes', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1202', name: 'Cuentas por Cobrar - Empleados', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1203', name: 'Cuentas por Cobrar - Diversos', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1301', name: 'IVA Crédito Fiscal', type: AccountType.ACTIVO, isTax: true, taxTag: 'IVA_credito' },
    { code: '1302', name: 'IVA Crédito Fiscal - Retenciones', type: AccountType.ACTIVO, isTax: true, taxTag: 'IVA_retencion' },
    { code: '1303', name: 'ISR Crédito Fiscal', type: AccountType.ACTIVO, isTax: true, taxTag: 'ISR_credito' },
    { code: '1401', name: 'Inventarios - Mercancías', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1402', name: 'Inventarios - Materiales Producción', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1403', name: 'Inventarios - Productos Terminados', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1501', name: 'Gastos Pagados por Anticipado', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1601', name: 'Terrenos', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1602', name: 'Edificaciones', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1603', name: 'Equipo de Transporte', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1604', name: 'Equipo de Cómputo', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1605', name: 'Muebles y Equipos de Oficina', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1606', name: 'Depreciación Acumulada - Edificaciones', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1607', name: 'Depreciación Acumulada - Transporte', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1608', name: 'Depreciación Acumulada - Cómputo', type: AccountType.ACTIVO, isTax: false, taxTag: null },
    { code: '1609', name: 'Depreciación Acumulada - Muebles', type: AccountType.ACTIVO, isTax: false, taxTag: null },

    // PASIVOS
    { code: '2101', name: 'Proveedores por Pagar', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2102', name: 'Proveedores por Pagar - Servicios', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2103', name: 'Retenciones por Pagar a Terceros', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2201', name: 'IVA Débito Fiscal por Pagar', type: AccountType.PASIVO, isTax: true, taxTag: 'IVA_debito' },
    { code: '2202', name: 'IVA Retenciones por Pagar', type: AccountType.PASIVO, isTax: true, taxTag: 'IVA_retencion_pagar' },
    { code: '2301', name: 'ISR por Pagar (Pago Mensual/Trimestral)', type: AccountType.PASIVO, isTax: true, taxTag: 'ISR_pagar' },
    { code: '2401', name: 'ISR Retenciones por Pagar', type: AccountType.PASIVO, isTax: true, taxTag: 'ISR_retencion' },
    { code: '2402', name: 'IVA Retenciones por Pagar (Factura Especial)', type: AccountType.PASIVO, isTax: true, taxTag: 'IVA_FESP_pagar' },
    { code: '2501', name: 'IGSS Patronal por Pagar', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2502', name: 'IGSS Laboral por Pagar', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2503', name: 'IRTRA por Pagar', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2504', name: 'INTECAP por Pagar', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2505', name: 'Bonificación 14 por Pagar', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2506', name: 'Vacaciones por Pagar', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2601', name: 'Préstamos Bancarios Corto Plazo', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2602', name: 'Préstamos Bancarios Largo Plazo', type: AccountType.PASIVO, isTax: false, taxTag: null },
    { code: '2701', name: 'Anticipo de Clientes', type: AccountType.PASIVO, isTax: false, taxTag: null },

    // CAPITAL
    { code: '3101', name: 'Capital Social', type: AccountType.CAPITAL, isTax: false, taxTag: null },
    { code: '3102', name: 'Prima en Colocación de Acciones', type: AccountType.CAPITAL, isTax: false, taxTag: null },
    { code: '3201', name: 'Reserva Legal', type: AccountType.CAPITAL, isTax: false, taxTag: null },
    { code: '3202', name: 'Utilidades Acumuladas', type: AccountType.CAPITAL, isTax: false, taxTag: null },
    { code: '3301', name: 'Resultado del Ejercicio', type: AccountType.CAPITAL, isTax: false, taxTag: null },

    // INGRESOS
    { code: '4101', name: 'Ventas - Servicios Publicitarios', type: AccountType.INGRESO, isTax: true, taxTag: 'ventas_servicios' },
    { code: '4102', name: 'Ventas - Producción Audiovisual', type: AccountType.INGRESO, isTax: true, taxTag: 'ventas_produccion' },
    { code: '4103', name: 'Ventas - Diseño Gráfico', type: AccountType.INGRESO, isTax: true, taxTag: 'ventas_diseno' },
    { code: '4104', name: 'Ventas - Pauta Digital', type: AccountType.INGRESO, isTax: true, taxTag: 'ventas_pauta' },
    { code: '4105', name: 'Ventas - Impresión y Materiales POP', type: AccountType.INGRESO, isTax: true, taxTag: 'ventas_impresion' },
    { code: '4201', name: 'Otros Ingresos Operativos', type: AccountType.INGRESO, isTax: false, taxTag: null },
    { code: '4301', name: 'Ingresos Financieros', type: AccountType.INGRESO, isTax: false, taxTag: null },

    // COSTOS DE VENTAS
    { code: '5001', name: 'Costo de Servicios Publicitarios', type: AccountType.GASTO, isTax: false, taxTag: 'costo_servicios' },
    { code: '5002', name: 'Costo de Producción Audiovisual', type: AccountType.GASTO, isTax: false, taxTag: 'costo_produccion' },
    { code: '5003', name: 'Costo de Materiales de Impresión', type: AccountType.GASTO, isTax: false, taxTag: 'costo_impresion' },
    { code: '5004', name: 'Costo de Pauta Digital (Terceros)', type: AccountType.GASTO, isTax: false, taxTag: 'costo_pauta' },

    // GASTOS OPERATIVOS - Clasificación SAT
    { code: '5102', name: 'Energía Eléctrica', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5103', name: 'Agua y Saneamiento', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5104', name: 'Teléfono y Comunicaciones', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5105', name: 'Internet y Enlaces Dedicados', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5106', name: 'Servicios Básicos Diversos', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },

    { code: '5201', name: 'Combustibles y Lubricantes', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5202', name: 'Mantenimiento de Vehículos', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5203', name: 'Seguros de Vehículos', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },

    { code: '5301', name: 'Alimentación y Representación', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR_50pct' },
    { code: '5302', name: 'Eventos y Capacitación', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },

    { code: '5401', name: 'Papelería y Útiles de Oficina', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5402', name: 'Tintas, Vinilos y Materiales de Impresión', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5403', name: 'Insumos de Diseño y Producción', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },

    { code: '5501', name: 'Arrendamiento de Locales', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5502', name: 'Arrendamiento de Equipos', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },

    { code: '5601', name: 'Honorarios Profesionales', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5602', name: 'Servicios de Freelance y Outsourcing', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5603', name: 'Auditoría y Asesoría Contable', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5604', name: 'Asesoría Legal', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },

    { code: '5701', name: 'Gastos Bancarios y Financieros', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_no_deducible' },
    { code: '5702', name: 'Intereses de Préstamos', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },

    { code: '5801', name: 'Gastos Médicos y Seguros Vida', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },

    { code: '5901', name: 'Fletes y Transportes', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5902', name: 'Publicidad y Mercadeo', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5903', name: 'Suscripciones Software y Licencias', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5904', name: 'Capacitación del Personal', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5905', name: 'Gastos Varios Deducibles', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '5906', name: 'Gastos No Deducibles (Multas, Donaciones no autorizadas)', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_no_deducible' },

    // GASTOS DE DEPRECIACIÓN Y AMORTIZACIÓN
    { code: '6101', name: 'Depreciación Edificaciones', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '6102', name: 'Depreciación Transporte', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '6103', name: 'Depreciación Equipo Cómputo', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '6104', name: 'Depreciación Muebles y Equipo', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },
    { code: '6201', name: 'Amortización Intangibles', type: AccountType.GASTO, isTax: true, taxTag: 'gasto_deducible_ISR' },

    // IMPUESTOS DIFERIDOS Y OTROS
    { code: '7101', name: 'Impuesto Diferido Activo', type: AccountType.ACTIVO, isTax: true, taxTag: 'impuesto_diferido' },
    { code: '7201', name: 'Impuesto Diferido Pasivo', type: AccountType.PASIVO, isTax: true, taxTag: 'impuesto_diferido' },
  ];

  for (const cuenta of cuentas) {
    await prisma.accountChart.upsert({
      where: {
        empresaId_code: { empresaId: empresa.id, code: cuenta.code },
      },
      update: {},
      create: {
        empresaId: empresa.id,
        code: cuenta.code,
        name: cuenta.name,
        type: cuenta.type,
        isTaxAccount: cuenta.isTax,
        defaultTaxTag: cuenta.taxTag,
        activa: true,
      },
    });
  }
  console.log('✅ Catálogo de cuentas creado (${cuentas.length} cuentas)');

  // ============================================
  // REGLAS DE CLASIFICACIÓN BASE (Globales + Empresa)
  // ============================================
  const reglasGlobales = [
    // Servicios públicos - Electricidad
    { id: 'regla-luz-1', priority: RulePriority.KEYWORD, condition: { keywords: ['EEGSA', 'ENERGUATE', 'DEORSA', 'DEOCSA', 'ENERGÍA ELÉCTRICA', 'ENERGIA ELECTRICA', 'DISTRIBUIDORA DE ELECTRICIDAD'] }, result: { accountCode: '5102', accountName: 'Energía Eléctrica', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Agua
    { id: 'regla-agua-1', priority: RulePriority.KEYWORD, condition: { keywords: ['EMPAGUA', 'AGUAS NACIONALES', 'AGUA POTABLE', 'SERVICIO DE AGUA'] }, result: { accountCode: '5103', accountName: 'Agua y Saneamiento', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Teléfono
    { id: 'regla-tel-1', priority: RulePriority.KEYWORD, condition: { keywords: ['CLARO', 'TIGO', 'MOVISTAR', 'TELEFONICA', 'TELECOMUNICACIONES', 'COMUNICACIONES'] }, result: { accountCode: '5104', accountName: 'Teléfono y Comunicaciones', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Internet
    { id: 'regla-net-1', priority: RulePriority.KEYWORD, condition: { keywords: ['INTERNET', 'FIBRA OPTICA', 'FIBERNET', 'CABLE XTREME', 'CABLEDISTRIBUCION', 'SERVICIOS DE INTERNET', 'ENLACE DEDICADO'] }, result: { accountCode: '5105', accountName: 'Internet y Enlaces Dedicados', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Combustible
    { id: 'regla-comb-1', priority: RulePriority.KEYWORD, condition: { keywords: ['PUMA', 'TEXACO', 'SHELL', 'GULF', 'PETROPLUS', 'GASOLINERA', 'COMBUSTIBLE', 'DIESEL', 'GASOLINA', 'ESTACION DE SERVICIO'] }, result: { accountCode: '5201', accountName: 'Combustibles y Lubricantes', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Alimentación
    { id: 'regla-alim-1', priority: RulePriority.KEYWORD, condition: { keywords: ['RESTAURANTE', 'CAFETERIA', 'POLLO', 'PIZZA', 'BURGER', 'ALIMENTOS', 'SUPERMERCADO', 'LA FRAGUA', 'WALMART', 'PAIZ', 'MAXI DESPENSA', 'DESPENSA', 'COMIDA', 'ALMUERZO'] }, result: { accountCode: '5301', accountName: 'Alimentación y Representación', taxTag: 'gasto_deducible_ISR_50pct' }, active: true, orden: 10 },
    // Papelería
    { id: 'regla-papel-1', priority: RulePriority.KEYWORD, condition: { keywords: ['PAPELERIA', 'IMPRENTA', 'OFFICEMAX', 'COPIADORA', 'IMPRESION', 'TONER', 'CARTUCHOS', 'UTILES DE OFICINA'] }, result: { accountCode: '5401', accountName: 'Papelería y Útiles de Oficina', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Alquiler
    { id: 'regla-alq-1', priority: RulePriority.KEYWORD, condition: { keywords: ['ARRENDAMIENTO', 'ALQUILER', 'RENTA DE LOCAL', 'INMOBILIARIA', 'ARRENDATARIO'] }, result: { accountCode: '5501', accountName: 'Arrendamiento de Locales', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Honorarios
    { id: 'regla-hon-1', priority: RulePriority.KEYWORD, condition: { keywords: ['HONORARIOS', 'CONSULTORÍA', 'CONSULTORIA', 'AUDITORIA', 'ABOGADO', 'NOTARIO', 'SERVICIOS PROFESIONALES', 'ASESORIA'] }, result: { accountCode: '5601', accountName: 'Honorarios Profesionales', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Bancarios
    { id: 'regla-ban-1', priority: RulePriority.KEYWORD, condition: { keywords: ['BANRURAL', 'BAC', 'G&T', 'INDUSTRIAL', 'PROMERICA', 'AGROMERCANTIL', 'COMISION BANCARIA', 'MANTENIMIENTO DE CUENTA', 'BANCO DE DESARROLLO', 'INTERBANCO'] }, result: { accountCode: '5701', accountName: 'Gastos Bancarios y Financieros', taxTag: 'gasto_no_deducible' }, active: true, orden: 10 },
    // Médicos
    { id: 'regla-med-1', priority: RulePriority.KEYWORD, condition: { keywords: ['CLINICA', 'HOSPITAL', 'FARMACIA', 'MEDICO', 'SALUD', 'LABORATORIO', 'FARMACEUTICA', 'DISPENSARIO'] }, result: { accountCode: '5801', accountName: 'Gastos Médicos', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Transporte
    { id: 'regla-trans-1', priority: RulePriority.KEYWORD, condition: { keywords: ['TRANSPORTE', 'FLETE', 'MENSAJERIA', 'COURIER', 'CARGO', 'ENCOMIENDA', 'GUATEEXPRESS', 'DHL', 'FEDEX'] }, result: { accountCode: '5901', accountName: 'Fletes y Transportes', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Publicidad
    { id: 'regla-pub-1', priority: RulePriority.KEYWORD, condition: { keywords: ['PUBLICIDAD', 'PROPAGANDA', 'MARKETING', 'DISEÑO GRAFICO', 'IMPRESOS', 'ROTULO', 'AGENCIA', 'FACEBOOK', 'GOOGLE ADS', 'INSTAGRAM ADS', 'TIKTOK ADS'] }, result: { accountCode: '5902', accountName: 'Publicidad y Mercadeo', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 10 },
    // Monto alto - alerta ISR
    { id: 'regla-monto-alto', priority: RulePriority.KEYWORD, condition: { montoMin: 50000 }, result: { accountCode: '5999', accountName: 'Por Clasificar (Monto Alto)', taxTag: 'verificar_retencion_ISR', notas: ['⚠️ Monto > Q50,000: Verificar si aplica retención ISR según régimen del proveedor'] }, active: true, orden: 50 },
    // Default
    { id: 'regla-default', priority: RulePriority.DEFAULT, condition: {}, result: { accountCode: '5905', accountName: 'Gastos Varios Deducibles', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 100 },
  ];

  for (const regla of reglasGlobales) {
    await prisma.classificationRule.upsert({
      where: { id: regla.id },
      update: {},
      create: {
        id: regla.id,
        empresaId: null, // global
        nombre: regla.id,
        priority: regla.priority,
        nitEmisor: regla.condition.nitEmisor || null,
        nombreContiene: regla.condition.nombreContiene || null,
        keywords: regla.condition.keywords ? JSON.stringify(regla.condition.keywords) : '[]',
        montoMin: regla.condition.montoMin || null,
        montoMax: regla.condition.montoMax || null,
        accountCode: regla.result.accountCode,
        accountName: regla.result.accountName,
        taxTag: regla.result.taxTag,
        notas: regla.result.notas ? JSON.stringify(regla.result.notas) : null,
        activo: regla.active,
        orden: regla.orden,
      },
    });
  }
  console.log('✅ Reglas globales creadas');

  // Reglas específicas para la empresa demo (publicidad)
  const reglasEmpresa = [
    { id: 'creativa-vinilo', priority: RulePriority.KEYWORD, condition: { keywords: ['VINILO', 'LONA', 'IMPRESION', 'IMPRESORA', 'TINTA', 'PLOTTER', 'SUBLIMACION', 'BANNER', 'ACRILICO', 'PVC'] }, result: { accountCode: '5402', accountName: 'Tintas, Vinilos y Material de Impresión', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 5, empresaId: empresa.id },
    { id: 'creativa-pauta', priority: RulePriority.KEYWORD, condition: { keywords: ['FACEBOOK ADS', 'FB ADS', 'GOOGLE ADS', 'INSTAGRAM ADS', 'TIKTOK ADS', 'PAUTA DIGITAL', 'META ADS'] }, result: { accountCode: '5902', accountName: 'Publicidad y Mercadeo - Pauta Digital', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 5, empresaId: empresa.id },
    { id: 'creativa-freelance', priority: RulePriority.KEYWORD, condition: { keywords: ['DISENO', 'DISEÑO', 'FREELANCE', 'ANIMACION', 'EDICION', 'LOCUCION', 'FOTOGRAFIA', 'VIDEO', 'POSTPRODUCCION'] }, result: { accountCode: '5602', accountName: 'Servicios de Freelance y Outsourcing', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 5, empresaId: empresa.id },
    { id: 'creativa-software', priority: RulePriority.KEYWORD, condition: { keywords: ['ADOBE', 'CREATIVE CLOUD', 'FIGMA', 'CANVA PRO', 'LICENCIA SOFTWARE', 'SUSCRIPCION SOFTWARE', 'SAAS'] }, result: { accountCode: '5903', accountName: 'Suscripciones Software y Licencias', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 5, empresaId: empresa.id },
    { id: 'creativa-papel', priority: RulePriority.NOMBRE_EXACTO, condition: { nombreContiene: 'OFFICENET' }, result: { accountCode: '5401', accountName: 'Papelería y Útiles de Oficina', taxTag: 'gasto_deducible_ISR' }, active: true, orden: 3, empresaId: empresa.id },
  ];

  for (const regla of reglasEmpresa) {
    await prisma.classificationRule.upsert({
      where: { id: regla.id },
      update: {},
      create: {
        id: regla.id,
        empresaId: regla.empresaId,
        nombre: regla.id,
        priority: regla.priority,
        nitEmisor: regla.condition.nitEmisor || null,
        nombreContiene: regla.condition.nombreContiene || null,
        keywords: regla.condition.keywords ? JSON.stringify(regla.condition.keywords) : '[]',
        montoMin: regla.condition.montoMin || null,
        montoMax: regla.condition.montoMax || null,
        accountCode: regla.result.accountCode,
        accountName: regla.result.accountName,
        taxTag: regla.result.taxTag,
        notas: regla.result.notas ? JSON.stringify(regla.result.notas) : null,
        activo: regla.active,
        orden: regla.orden,
      },
    });
  }
  console.log('✅ Reglas específicas de empresa creadas');

  // ============================================
  // DOCUMENTOS FEL DE EJEMPLO (para probar Libro Compras)
  // ============================================
  const felDocs = [
    {
      uuid: 'FEL-20250720-001',
      serie: 'A', numero: '00001245',
      tipoDocumento: TipoDocumentoFEL.FACT,
      fecha: new Date('2025-07-20'),
      hora: '10:30:00',
      moneda: 'GTQ',
      emisorNit: '1234567-8', emisorNombre: 'ENERGUATE S.A.', emisorDireccion: 'Ciudad de Guatemala', emisorMunicipio: 'Guatemala', emisorDepartamento: 'Guatemala', emisorAfiliacionIVA: 'GEN',
      receptorNit: empresa.nit, receptorNombre: empresa.nombreComercial || empresa.nombre,
      granTotal: 1284.50, baseGravable: 1146.85, totalIVA: 137.65, ivaTasa: 0.12,
      isrRetencion: 0, ivaRetencion: 0, aplicaRetencionISR: false, aplicaRetencionIVA: false,
      cuentaContableCode: '5102', cuentaContableName: 'Energía Eléctrica', taxTag: 'gasto_deducible_ISR', clasificacionConfianza: 95, clasificacionRegla: 'regla-luz-1',
      estado: EstadoDocumento.CONTABILIZADO, direccion: TipoMovimiento.COMPRA,
      certificadorNit: '56407734', certificadorNombre: 'AINNOVA, SOCIEDAD ANONIMA', fechaCertificacion: new Date('2025-07-20T10:30:00'),
      xmlOriginal: '<xml>demo</xml>',
      items: { create: [{ linea: 1, descripcion: 'Consumo energía eléctrica período julio 2025', cantidad: 1, unidadMedida: 'UND', precioUnitario: 1146.85, descuento: 0, precio: 1146.85, montoIVA: 137.65, total: 1284.50 }] },
    },
    {
      uuid: 'FEL-20250720-002',
      serie: 'B', numero: '00005821',
      tipoDocumento: TipoDocumentoFEL.FACT,
      fecha: new Date('2025-07-20'),
      hora: '14:15:00',
      moneda: 'GTQ',
      emisorNit: '8765432-1', emisorNombre: 'CLARO GUATEMALA S.A.', emisorDireccion: 'Ciudad de Guatemala', emisorMunicipio: 'Guatemala', emisorDepartamento: 'Guatemala', emisorAfiliacionIVA: 'GEN',
      receptorNit: empresa.nit, receptorNombre: empresa.nombreComercial || empresa.nombre,
      granTotal: 450.00, baseGravable: 401.79, totalIVA: 48.21, ivaTasa: 0.12,
      isrRetencion: 0, ivaRetencion: 0, aplicaRetencionISR: false, aplicaRetencionIVA: false,
      cuentaContableCode: '5104', cuentaContableName: 'Teléfono y Comunicaciones', taxTag: 'gasto_deducible_ISR', clasificacionConfianza: 90, clasificacionRegla: 'regla-tel-1',
      estado: EstadoDocumento.CONTABILIZADO, direccion: TipoMovimiento.COMPRA,
      certificadorNit: '56407734', certificadorNombre: 'AINNOVA, SOCIEDAD ANONIMA', fechaCertificacion: new Date('2025-07-20T14:15:00'),
      xmlOriginal: '<xml>demo</xml>',
      items: { create: [{ linea: 1, descripcion: 'Servicio telefónico corporativo julio 2025', cantidad: 1, unidadMedida: 'UND', precioUnitario: 401.79, descuento: 0, precio: 401.79, montoIVA: 48.21, total: 450.00 }] },
    },
    {
      uuid: 'FEL-20250719-003',
      serie: 'FESP', numero: '00000087',
      tipoDocumento: TipoDocumentoFEL.FESP,
      fecha: new Date('2025-07-19'),
      hora: '09:00:00',
      moneda: 'GTQ',
      emisorNit: '5432109-8', emisorNombre: 'MARIO ENRIQUE LOPEZ GARCIA', emisorDireccion: 'Zona 10, Guatemala', emisorMunicipio: 'Guatemala', emisorDepartamento: 'Guatemala', emisorAfiliacionIVA: 'GEN',
      receptorNit: empresa.nit, receptorNombre: empresa.nombreComercial || empresa.nombre,
      granTotal: 8500.00, baseGravable: 7589.29, totalIVA: 910.71, ivaTasa: 0.12,
      isrRetencion: 379.46, ivaRetencion: 910.71, aplicaRetencionISR: true, aplicaRetencionIVA: true,
      cuentaContableCode: '5601', cuentaContableName: 'Honorarios Profesionales', taxTag: 'gasto_deducible_ISR', clasificacionConfianza: 70, clasificacionRegla: 'creativa-freelance',
      estado: EstadoDocumento.CONTABILIZADO, direccion: TipoMovimiento.COMPRA,
      certificadorNit: '12521337', certificadorNombre: 'INFILE, SOCIEDAD ANONIMA', fechaCertificacion: new Date('2025-07-19T09:00:00'),
      xmlOriginal: '<xml>demo</xml>',
      items: { create: [{ linea: 1, descripcion: 'Servicios de producción audiovisual y edición', cantidad: 1, unidadMedida: 'UND', precioUnitario: 7589.29, descuento: 0, precio: 7589.29, montoIVA: 910.71, total: 8500.00 }] },
    },
    {
      uuid: 'FEL-20250719-004',
      serie: 'C', numero: '00012458',
      tipoDocumento: TipoDocumentoFEL.FACT,
      fecha: new Date('2025-07-19'),
      hora: '11:45:00',
      moneda: 'GTQ',
      emisorNit: '2345678-9', emisorNombre: 'PUMA ENERGY GUATEMALA S.A.', emisorDireccion: 'Calzada Roosevelt', emisorMunicipio: 'Guatemala', emisorDepartamento: 'Guatemala', emisorAfiliacionIVA: 'GEN',
      receptorNit: empresa.nit, receptorNombre: empresa.nombreComercial || empresa.nombre,
      granTotal: 3200.00, baseGravable: 2857.14, totalIVA: 342.86, ivaTasa: 0.12,
      isrRetencion: 0, ivaRetencion: 0, aplicaRetencionISR: false, aplicaRetencionIVA: false,
      cuentaContableCode: '5201', cuentaContableName: 'Combustibles y Lubricantes', taxTag: 'gasto_deducible_ISR', clasificacionConfianza: 95, clasificacionRegla: 'regla-comb-1',
      estado: EstadoDocumento.CONTABILIZADO, direccion: TipoMovimiento.COMPRA,
      certificadorNit: '56407734', certificadorNombre: 'AINNOVA, SOCIEDAD ANONIMA', fechaCertificacion: new Date('2025-07-19T11:45:00'),
      xmlOriginal: '<xml>demo</xml>',
      items: { create: [{ linea: 1, descripcion: 'Gasolina Superior', cantidad: 200, unidadMedida: 'GAL', precioUnitario: 14.29, descuento: 0, precio: 2857.14, montoIVA: 342.86, total: 3200.00 }] },
    },
    {
      uuid: 'FEL-20250718-005',
      serie: 'P', numero: '00000542',
      tipoDocumento: TipoDocumentoFEL.FPEQ,
      fecha: new Date('2025-07-18'),
      hora: '16:20:00',
      moneda: 'GTQ',
      emisorNit: '9876543-2', emisorNombre: 'TIENDA EL PROGRESO', emisorDireccion: 'Zona 1', emisorMunicipio: 'Guatemala', emisorDepartamento: 'Guatemala', emisorAfiliacionIVA: 'PEQ',
      receptorNit: empresa.nit, receptorNombre: empresa.nombreComercial || empresa.nombre,
      granTotal: 125.00, baseGravable: 125.00, totalIVA: 0, ivaTasa: 0,
      isrRetencion: 0, ivaRetencion: 0, aplicaRetencionISR: false, aplicaRetencionIVA: false,
      cuentaContableCode: '5905', cuentaContableName: 'Gastos Varios Deducibles', taxTag: 'gasto_deducible_ISR', clasificacionConfianza: 30, clasificacionRegla: 'regla-default',
      estado: EstadoDocumento.CONTABILIZADO, direccion: TipoMovimiento.COMPRA,
      certificadorNit: '16693949', certificadorNombre: 'SAT', fechaCertificacion: new Date('2025-07-18T16:20:00'),
      xmlOriginal: '<xml>demo</xml>',
      items: { create: [{ linea: 1, descripcion: 'Agua pura de oficina', cantidad: 5, unidadMedida: 'UND', precioUnitario: 25.00, descuento: 0, precio: 125.00, montoIVA: 0, total: 125.00 }] },
    },
    {
      uuid: 'FEL-20250717-006',
      serie: 'D', numero: '00000021',
      tipoDocumento: TipoDocumentoFEL.FACT,
      fecha: new Date('2025-07-17'),
      hora: '10:00:00',
      moneda: 'GTQ',
      emisorNit: '3456789-0', emisorNombre: 'MAQUINARIA E IMPRESION INDUSTRIAL S.A.', emisorDireccion: 'Zona 12', emisorMunicipio: 'Guatemala', emisorDepartamento: 'Guatemala', emisorAfiliacionIVA: 'GEN',
      receptorNit: empresa.nit, receptorNombre: empresa.nombreComercial || empresa.nombre,
      granTotal: 85000.00, baseGravable: 75892.86, totalIVA: 9107.14, ivaTasa: 0.12,
      isrRetencion: 0, ivaRetencion: 0, aplicaRetencionISR: false, aplicaRetencionIVA: false,
      cuentaContableCode: '5402', cuentaContableName: 'Tintas, Vinilos y Material de Impresión', taxTag: 'gasto_deducible_ISR', clasificacionConfianza: 85, clasificacionRegla: 'creativa-vinilo',
      estado: EstadoDocumento.PROCESADO, direccion: TipoMovimiento.COMPRA,
      certificadorNit: '56407734', certificadorNombre: 'AINNOVA, SOCIEDAD ANONIMA', fechaCertificacion: new Date('2025-07-17T10:00:00'),
      xmlOriginal: '<xml>demo</xml>',
      items: { create: [{ linea: 1, descripcion: 'Vinilos publicitarios y materiales POP para campaña', cantidad: 1, unidadMedida: 'UND', precioUnitario: 75892.86, descuento: 0, precio: 75892.86, montoIVA: 9107.14, total: 85000.00 }] },
    },
  ];

  for (const doc of felDocs) {
    const { items, ...docData } = doc;
    await prisma.felDocumento.upsert({
      where: { empresaId_uuid: { empresaId: empresa.id, uuid: docData.uuid } },
      update: {},
      create: {
        ...docData,
        empresaId: empresa.id,
        items: { create: items.create },
      },
    });
  }
  console.log('✅ Documentos FEL de ejemplo creados');

  // ============================================
  // ASIENTOS CONTABLES DE EJEMPLO (para cada FEL)
  // ============================================
  for (const doc of felDocs) {
    const fel = await prisma.felDocumento.findUnique({ where: { empresaId_uuid: { empresaId: empresa.id, uuid: doc.uuid } } });
    if (!fel) continue;

    const ivaCredito = fel.emisorAfiliacionIVA !== 'PEQ' && fel.tipoDocumento !== 'FPEQ' ? fel.totalIVA : 0;
    const netoPagar = fel.granTotal - (fel.aplicaRetencionIVA ? fel.ivaRetencion : 0) - (fel.aplicaRetencionISR ? fel.isrRetencion : 0);

    await prisma.journalEntry.upsert({
      where: { id: `asiento-${fel.uuid}` },
      update: {},
      create: {
        id: `asiento-${fel.uuid}`,
        empresaId: empresa.id,
        periodoId: (await prisma.periodo.findFirst({ where: { empresaId: empresa.id, año: 2025, mes: 7 } }))?.id,
        felId: fel.id,
        fecha: fel.fecha,
        referencia: fel.uuid,
        descripcion: `${fel.emisorNombre} — ${fel.serie}-${fel.numero} (${fel.tipoDocumento})`,
        tipo: EntryType.COMPRAS,
        estado: fel.estado === EstadoDocumento.CONTABILIZADO ? EntryStatus.POSTEADO : EntryStatus.BORRADOR,
        source: EntrySource.FEL_XML,
        createdBy: contador.id,
        items: {
          create: [
            // Débito Gasto
            {
              accountCode: fel.cuentaContableCode || '5905',
              accountName: fel.cuentaContableName || 'Gastos Varios',
              debe: fel.baseGravable,
              haber: 0,
              descripcion: `${fel.emisorNombre} — ${fel.serie}-${fel.numero}`,
              taxTags: JSON.stringify([fel.taxTag || 'gasto_deducible_ISR']),
              felUuid: fel.uuid,
            },
            // Débito IVA Crédito Fiscal
            ...(ivaCredito > 0 ? [{
              accountCode: '1301',
              accountName: 'IVA Crédito Fiscal',
              debe: ivaCredito,
              haber: 0,
              descripcion: `IVA — ${fel.serie}-${fel.numero}`,
              taxTags: JSON.stringify(['IVA_credito']),
              felUuid: fel.uuid,
            }] : []),
            // Crédito IVA Retención (FESP)
            ...(fel.aplicaRetencionIVA && fel.ivaRetencion > 0 ? [{
              accountCode: '2402',
              accountName: 'IVA Retenciones por Pagar (FESP)',
              debe: 0,
              haber: fel.ivaRetencion,
              descripcion: `IVA Retenido FESP — ${fel.serie}-${fel.numero}`,
              taxTags: JSON.stringify(['IVA_retencion_FESP']),
              felUuid: fel.uuid,
            }] : []),
            // Crédito ISR Retención
            ...(fel.aplicaRetencionISR && fel.isrRetencion > 0 ? [{
              accountCode: '2401',
              accountName: 'ISR Retenciones por Pagar',
              debe: 0,
              haber: fel.isrRetencion,
              descripcion: `ISR Retenido FESP — ${fel.serie}-${fel.numero}`,
              taxTags: JSON.stringify(['ISR_retencion']),
              felUuid: fel.uuid,
            }] : []),
            // Crédito Proveedores
            {
              accountCode: '2101',
              accountName: 'Proveedores por Pagar',
              debe: 0,
              haber: netoPagar,
              descripcion: `${fel.emisorNombre} — ${fel.serie}-${fel.numero}`,
              taxTags: JSON.stringify(['pasivo_comercial']),
              felUuid: fel.uuid,
            },
          ],
        },
      },
    });
  }
  console.log('✅ Asientos contables creados');

  // ============================================
  // AUDIT LOG DE EJEMPLO
  // ============================================
  for (const log of [
    { userId: contador.id, entityType: 'Empresa', entityId: empresa.id, action: AuditAction.CREATE, afterState: JSON.stringify({ nombre: empresa.nombre, nit: empresa.nit }), ip: '127.0.0.1', userAgent: 'seed-script' },
    { userId: contador.id, entityType: 'AccountChart', entityId: 'bulk', action: AuditAction.CREATE, afterState: JSON.stringify({ count: cuentas.length }), ip: '127.0.0.1', userAgent: 'seed-script' },
    { userId: contador.id, entityType: 'ClassificationRule', entityId: 'bulk', action: AuditAction.CREATE, afterState: JSON.stringify({ count: reglasGlobales.length + reglasEmpresa.length }), ip: '127.0.0.1', userAgent: 'seed-script' },
  ]) {
    await prisma.auditLog.create({ data: log });
  }
  console.log('✅ Audit logs creados');

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Usuarios:');
  console.log('   • admin@contagt.gt / ContaGT2025! (Super Admin)');
  console.log('   • contador@demo.gt / ContaGT2025! (Contador)');
  console.log('   • auditor@demo.gt / ContaGT2025! (Auditor)');
  console.log('🏢 Empresa: Publicidad Creativa S.A. (NIT: 12345678-9)');
  console.log('📚 Catálogo: 100+ cuentas plan contable Guatemala');
  console.log('📋 Reglas: 16 globales + 4 específicas (publicidad)');
  console.log('📄 FELs: 6 documentos de prueba (FACT, FESP, FPEQ)');
  console.log('📖 Períodos: 12 meses 2025 (ene-jul cerrados)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });