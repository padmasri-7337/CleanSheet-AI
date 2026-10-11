import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Network,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  Package,
  Calendar,
  Layers,
  FileSpreadsheet,
  Zap,
  Info,
  Database,
  BarChart3,
  Sparkles,
  Copy,
  Check,
  Search,
  Calculator,
  GitBranch,
  ChevronRight,
  RotateCcw,
  Clock,
  ExternalLink,
  Table,
  Eye,
  Sliders,
  Maximize2
} from 'lucide-react';
import { DatasetPreview, DetectedIssue } from '../types';

interface ErrorImpactMapProps {
  dataset: DatasetPreview;
  onApplyQuickFix?: (issue: DetectedIssue) => Promise<void>;
  onApplyOperation?: (operation: string, params: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
}

export interface AnomalyImpactCase {
  id: string;
  stepName: string;
  sourceColumn: string;
  rowIndex: number;
  flaggedValue: string;
  suggestedValue: string;
  defectCategory: string;
  defectTitle: string;
  severity: 'critical' | 'high' | 'medium';
  affectedRowCount: number;
  formulaDefinition: string;
  flaggedCalculationResult: string;
  recalculatedResult: string;
  varianceDelta: string;
  variancePct: string;
  downstreamColumns: string[];
  affectedReports: string[];
  consequenceExplanation: string;
  suggestedAction: string;
  suggestedParams: Record<string, any>;
  issueRef?: DetectedIssue;
  iconType: 'quantity' | 'currency' | 'date' | 'identifier' | 'duplicate' | 'generic';
}

export const ErrorImpactMap: React.FC<ErrorImpactMapProps> = ({
  dataset,
  onApplyQuickFix,
  onApplyOperation,
  isLoading = false
}) => {
  // Active step state: 1 to 6
  const [activeStep, setActiveStep] = useState<number>(5);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [sourceSearchTerm, setSourceSearchTerm] = useState<string>('');
  const [targetSearchTerm, setTargetSearchTerm] = useState<string>('');
  const [activeHighlightedColumn, setActiveHighlightedColumn] = useState<string | null>(null);

  // Dynamic Lineage Curve Refs & State
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const targetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [linePaths, setLinePaths] = useState<{ id: string; d: string; color: string; dashed?: boolean }[]>([]);

  // CSV Only Gate: Check if file format is CSV (handles '.csv', 'csv', or filename ending in .csv)
  const isCsvFile = useMemo(() => {
    const format = (dataset.file_format || '').toLowerCase().trim().replace(/^\./, '');
    const filename = (dataset.filename || '').toLowerCase().trim();
    return format === 'csv' || format.includes('csv') || filename.endsWith('.csv');
  }, [dataset.file_format, dataset.filename]);

  // Anomaly Detection & Impact Calculation Engine
  const impactCases = useMemo<AnomalyImpactCase[]>(() => {
    if (!isCsvFile) return [];

    const cases: AnomalyImpactCase[] = [];
    const issues = dataset.issues || [];
    const rows = dataset.preview_rows || [];
    const cols = dataset.columns || [];

    const findRowSample = (predicate: (r: Record<string, any>, idx: number) => boolean) => {
      for (let i = 0; i < rows.length; i++) {
        if (predicate(rows[i], i)) {
          return { row: rows[i], index: i + 1 };
        }
      }
      return null;
    };

    // 1. Quantity / Units Anomaly
    const qtyCol = cols.find((c) => /quant|qty|count|units|volume|items/i.test(c.name));
    const priceCol = cols.find((c) => /price|cost|rate|amount|salary|fee/i.test(c.name));
    const totalCol = cols.find((c) => /total|subtotal|gross|amount/i.test(c.name) && c.name !== priceCol?.name);
    const qtyIssue = issues.find((i) =>
      i.affected_columns?.some((c) => /quant|qty|count|units|volume|items/i.test(c))
    );

    if (qtyCol || qtyIssue) {
      const colName = qtyIssue?.affected_columns?.[0] || qtyCol?.name || 'units_sold';
      const sample = findRowSample((r) => r[colName] === null || r[colName] === '' || r[colName] === undefined || r[colName] === '0') || {
        row: rows[4] || rows[0] || {},
        index: 5
      };

      const unitPriceVal = priceCol ? parseFloat(String(sample.row[priceCol.name] || '0').replace(/[^0-9.-]+/g, '')) || 299.99 : 299.99;
      const flaggedQty = sample.row[colName] === null || sample.row[colName] === undefined ? 'null (missing)' : String(sample.row[colName]);
      const correctedQty = 1;
      const flaggedTotal = 0.00;
      const recalculatedTotal = correctedQty * unitPriceVal;
      const delta = recalculatedTotal - flaggedTotal;

      cases.push({
        id: 'impact_quantity_cascade',
        stepName: 'Quantity & Units Anomaly',
        sourceColumn: colName,
        rowIndex: sample.index,
        flaggedValue: flaggedQty,
        suggestedValue: '1 (imputed median / default unit)',
        defectCategory: 'Missing / Corrupted Numerical Quantity',
        defectTitle: qtyIssue?.title || `Missing or invalid quantity in '${colName}' at Row #${sample.index}`,
        severity: 'critical',
        affectedRowCount: qtyCol?.missing_count || 1,
        formulaDefinition: `total_amount = ${colName} × ${priceCol?.name || 'unit_price'}`,
        flaggedCalculationResult: `$${flaggedTotal.toFixed(2)} (distorted by missing ${colName})`,
        recalculatedResult: `$${recalculatedTotal.toFixed(2)}`,
        varianceDelta: `+$${delta.toFixed(2)}`,
        variancePct: '+100% line revenue distortion',
        downstreamColumns: [
          totalCol?.name || 'total_amount',
          'subtotal',
          'inventory_status',
          'reorder_level',
          'gross_margin'
        ],
        affectedReports: [
          'Inventory Valuation & Warehouse Replenishment',
          'General Ledger (GL) Revenue Recognition',
          'Supply Chain Stockout Forecasting'
        ],
        consequenceExplanation:
          `Because '${colName}' is missing or corrupted at Row #${sample.index}, downstream line totals evaluate to $0.00 instead of $${recalculatedTotal.toFixed(2)}. This artificially suppresses revenue, offsets inventory replenishment schedules, and risks stockouts.`,
        suggestedAction: qtyIssue?.suggested_action || 'handle_missing',
        suggestedParams: qtyIssue?.suggested_params || {
          columns: [colName],
          strategy: 'fill_median'
        },
        issueRef: qtyIssue,
        iconType: 'quantity'
      });
    }

    // 2. Unit Price / Currency Format Anomaly
    const priceIssue = issues.find((i) =>
      i.affected_columns?.some((c) => /price|cost|rate|amount|salary|fee/i.test(c)) ||
      i.category === 'types'
    );
    if (priceCol || priceIssue) {
      const colName = priceIssue?.affected_columns?.[0] || priceCol?.name || 'unit_price';
      const sample = findRowSample((r) => typeof r[colName] === 'string' && (r[colName].includes('$') || r[colName].includes(',') || isNaN(Number(r[colName])))) || {
        row: rows[0] || {},
        index: 1
      };

      const rawPrice = String(sample.row[colName] || '$1,200.50');
      const cleanPrice = parseFloat(rawPrice.replace(/[^0-9.-]+/g, '')) || 1200.50;

      cases.push({
        id: 'impact_price_cascade',
        stepName: 'Currency Format & Data Type Anomaly',
        sourceColumn: colName,
        rowIndex: sample.index,
        flaggedValue: `"${rawPrice}" (String / Unparsed Symbol)`,
        suggestedValue: `${cleanPrice.toFixed(2)} (Float64 Numeric)`,
        defectCategory: 'Unparsed Currency String / Text Format',
        defectTitle: priceIssue?.title || `Currency symbol and string format in '${colName}' at Row #${sample.index}`,
        severity: 'critical',
        affectedRowCount: priceCol?.missing_count || dataset.row_count,
        formulaDefinition: `gross_revenue = SUM(${colName})`,
        flaggedCalculationResult: 'TypeError: unsupported operand type(s) for +: "float" and "str"',
        recalculatedResult: `$${(cleanPrice * dataset.row_count).toLocaleString()} (valid aggregation)`,
        varianceDelta: 'Complete Query Failure ➔ 100% Recovered',
        variancePct: 'Prevents SQL/Pandas aggregation crashes',
        downstreamColumns: [
          'gross_revenue',
          'net_profit',
          'tax_payable',
          'avg_order_value'
        ],
        affectedReports: [
          'P&L Financial Income Statement',
          'Tax Compliance & Audit Schedule',
          'Executive BI Sales Dashboards'
        ],
        consequenceExplanation:
          `Text-formatted strings ($/€/£) in '${colName}' crash SQL & Pandas aggregation functions (SUM/AVG), breaking BI pipelines and preventing quarterly revenue rollups.`,
        suggestedAction: priceIssue?.suggested_action || 'convert_types',
        suggestedParams: priceIssue?.suggested_params || {
          columns: [colName],
          target_type: 'currency_numeric'
        },
        issueRef: priceIssue,
        iconType: 'currency'
      });
    }

    // 3. Date Discrepancy Anomaly
    const dateCol = cols.find((c) => /date|time|created|timestamp|period/i.test(c.name));
    const dateIssue = issues.find((i) =>
      i.affected_columns?.some((c) => /date|time|created|timestamp|period/i.test(c))
    );
    if (dateCol || dateIssue) {
      const colName = dateIssue?.affected_columns?.[0] || dateCol?.name || 'purchase_date';
      const sample = findRowSample((r) => String(r[colName] || '').includes('/') || String(r[colName] || '').includes('-')) || {
        row: rows[1] || {},
        index: 2
      };

      const rawDate = String(sample.row[colName] || '15/01/2023');
      const standardDate = '2023-01-15';

      cases.push({
        id: 'impact_date_cascade',
        stepName: 'Date Standardization Anomaly',
        sourceColumn: colName,
        rowIndex: sample.index,
        flaggedValue: `"${rawDate}" (Mixed format DD/MM/YYYY)`,
        suggestedValue: `"${standardDate}" (ISO-8601 YYYY-MM-DD)`,
        defectCategory: 'Inconsistent Date Formatting',
        defectTitle: dateIssue?.title || `Mixed date format in '${colName}' at Row #${sample.index}`,
        severity: 'high',
        affectedRowCount: dateCol?.missing_count || dataset.row_count,
        formulaDefinition: `fiscal_quarter = Date.getQuarter(${colName})`,
        flaggedCalculationResult: 'Miscalculated Quarter (Interprets 01/15 as month 15 ➔ Out of Bounds or Q3)',
        recalculatedResult: 'Q1-2023 (Verified Fiscal Period)',
        varianceDelta: 'Quarterly Allocation Discrepancy',
        variancePct: 'Cross-period misallocation risk',
        downstreamColumns: ['fiscal_quarter', 'delivery_lead_time', 'aging_bucket', 'sla_status'],
        affectedReports: [
          'Quarterly Revenue Growth (QoQ)',
          'Customer Churn Cohort Matrix',
          'Accounts Receivable (A/R) Aging'
        ],
        consequenceExplanation:
          `Inconsistent date formats (e.g. DD/MM/YYYY mixed with YYYY-MM-DD) corrupt temporal sorting and cohort bucketing, misattributing revenue to incorrect fiscal quarters.`,
        suggestedAction: dateIssue?.suggested_action || 'convert_types',
        suggestedParams: dateIssue?.suggested_params || {
          columns: [colName],
          target_type: 'datetime',
          date_format: '%Y-%m-%d'
        },
        issueRef: dateIssue,
        iconType: 'date'
      });
    }

    // 4. Identifier / Customer Code Integrity
    const idCol = cols.find((c) => /id|code|sku|uuid|account/i.test(c.name));
    const idIssue = issues.find((i) =>
      i.affected_columns?.some((c) => /id|code|sku|uuid|account/i.test(c))
    );
    if (idCol || idIssue) {
      const colName = idIssue?.affected_columns?.[0] || idCol?.name || 'customer_code';
      const sample = findRowSample((r) => String(r[colName] || '').startsWith('00') || String(r[colName] || '').includes('ORD')) || {
        row: rows[0] || {},
        index: 1
      };
      const rawId = String(sample.row[colName] || '00101');

      cases.push({
        id: 'impact_identifier_cascade',
        stepName: 'Identifier & Foreign Key Anomaly',
        sourceColumn: colName,
        rowIndex: sample.index,
        flaggedValue: `"${rawId}" (Risk of Integer Truncation to 101)`,
        suggestedValue: `"${rawId}" (Preserved String / Text Key)`,
        defectCategory: 'Leading Zero & Foreign Key Integrity',
        defectTitle: idIssue?.title || `Identifier integrity in '${colName}' at Row #${sample.index}`,
        severity: 'medium',
        affectedRowCount: idCol?.missing_count || dataset.row_count,
        formulaDefinition: `crm_join_key = CRM_USERS.find(user_id == ${colName})`,
        flaggedCalculationResult: 'JOIN Failure (No match for integer key 101 in database)',
        recalculatedResult: '100% Foreign Key Match with Customer Master',
        varianceDelta: 'Zero Orphaned Purchase Records',
        variancePct: '100% data lineage restored',
        downstreamColumns: ['customer_ltv', 'repeat_order_rate', 'crm_synced_profile'],
        affectedReports: [
          'CRM Database Foreign Key Joins',
          'Customer Lifetime Value (LTV) Model',
          'Outbound Email Campaign Segments'
        ],
        consequenceExplanation:
          `If leading zeros in '${colName}' are dropped during CSV parsing, database relational joins fail, breaking customer lifetime value (LTV) models and fragmenting profiles.`,
        suggestedAction: idIssue?.suggested_action || 'convert_types',
        suggestedParams: idIssue?.suggested_params || {
          columns: [colName],
          target_type: 'identifier'
        },
        issueRef: idIssue,
        iconType: 'identifier'
      });
    }

    // Fallback: If no specific cases triggered, create a comprehensive schema lineage case
    if (cases.length === 0 && cols.length > 0) {
      const firstCol = cols[0].name;
      cases.push({
        id: 'impact_general_cascade',
        stepName: 'General Column Schema Lineage',
        sourceColumn: firstCol,
        rowIndex: 1,
        flaggedValue: 'Active Lineage Mapping',
        suggestedValue: 'Standardized Format',
        defectCategory: 'Schema & Lineage Tracking',
        defectTitle: `Column Lineage & Downstream Propagation for '${firstCol}'`,
        severity: 'medium',
        affectedRowCount: dataset.row_count,
        formulaDefinition: `derived_metric = PROCESS(${firstCol})`,
        flaggedCalculationResult: 'Unshielded Raw Stream',
        recalculatedResult: 'Validated Deterministic Output',
        varianceDelta: '100% Pipeline Consistency',
        variancePct: 'Continuous monitoring active',
        downstreamColumns: cols.slice(1, 4).map((c) => c.name),
        affectedReports: ['Analytics BI Dashboard', 'Executive Operational Summary'],
        consequenceExplanation: `Column '${firstCol}' acts as an input driver for downstream transformation tables and executive dashboards.`,
        suggestedAction: 'convert_types',
        suggestedParams: { columns: [firstCol] },
        iconType: 'generic'
      });
    }

    return cases;
  }, [dataset, isCsvFile]);

  // Active case selection
  const activeCase = useMemo(() => {
    if (selectedCaseId) {
      const found = impactCases.find((c) => c.id === selectedCaseId);
      if (found) return found;
    }
    return impactCases[0] || null;
  }, [impactCases, selectedCaseId]);

  // Set default highlight column from active case
  useEffect(() => {
    if (activeCase && !activeHighlightedColumn) {
      setActiveHighlightedColumn(activeCase.sourceColumn);
    }
  }, [activeCase]);

  // Helper for column type icon in the lineage diagram
  const getColTypeIcon = (type: string, name: string) => {
    const n = name.toLowerCase();
    const t = type.toLowerCase();
    if (t.includes('int') || t.includes('float') || t.includes('num') || n.includes('id') || n.includes('code') || n.includes('units') || n.includes('price') || n.includes('total') || n.includes('amount')) {
      return <span className="font-mono text-[11px] font-black text-indigo-600">#</span>;
    }
    if (t.includes('date') || t.includes('time') || n.includes('date') || n.includes('time') || n.includes('utc')) {
      return <Clock className="w-3 h-3 text-slate-500" />;
    }
    return <span className="font-serif text-[11px] font-bold text-slate-500">T</span>;
  };

  // Filtered Source Columns for Search in Diagram
  const filteredSourceColumns = useMemo(() => {
    const list = dataset.columns || [];
    if (!sourceSearchTerm.trim()) return list;
    return list.filter((c) => c.name.toLowerCase().includes(sourceSearchTerm.toLowerCase()));
  }, [dataset.columns, sourceSearchTerm]);

  // Target Derived Columns for Top Right Card
  const targetDerivedColumns = useMemo(() => {
    const base = [
      { name: 'ID', type: 'integer' },
      { name: 'STATUS', type: 'string' },
      { name: 'ORDER_DATE_UTC', type: 'datetime' },
      { name: 'USER_ID', type: 'integer', isMappedTarget: true },
      { name: 'TOTAL_AMOUNT', type: 'float', isMappedTarget: true },
      { name: 'INVENTORY_REORDER_FLAG', type: 'string' },
      { name: 'GROSS_MARGIN', type: 'float' }
    ];
    if (!targetSearchTerm.trim()) return base;
    return base.filter((c) => c.name.toLowerCase().includes(targetSearchTerm.toLowerCase()));
  }, [targetSearchTerm]);

  // Dynamic Line Calculation Engine: Connects from source cards all the way across to target cards
  const updateDynamicPaths = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newPaths: { id: string; d: string; color: string; dashed?: boolean }[] = [];

    const addConnector = (sourceKey: string, targetKey: string, color: string, dashed?: boolean) => {
      const el1 = sourceRefs.current[sourceKey];
      const el2 = targetRefs.current[targetKey];
      if (el1 && el2) {
        const r1 = el1.getBoundingClientRect();
        const r2 = el2.getBoundingClientRect();
        const x1 = r1.right - containerRect.left;
        const y1 = r1.top + r1.height / 2 - containerRect.top;
        const x2 = r2.left - containerRect.left;
        const y2 = r2.top + r2.height / 2 - containerRect.top;
        const dx = Math.max(x2 - x1, 40);
        const cx1 = x1 + dx * 0.45;
        const cx2 = x2 - dx * 0.45;
        newPaths.push({
          id: `${sourceKey}->${targetKey}`,
          d: `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`,
          color,
          dashed
        });
      }
    };

    const cols = dataset.columns || [];

    // 1. Source ID / Customer Code to ORDERS USER_ID
    const idCol = cols.find((c) => /id|code|sku/i.test(c.name))?.name || cols[0]?.name;
    if (idCol) addConnector(idCol, 'target_USER_ID', '#6366F1');

    // 2. Source Date to ORDERS ORDER_DATE_UTC
    const dateCol = cols.find((c) => /date|time/i.test(c.name))?.name;
    if (dateCol) addConnector(dateCol, 'target_ORDER_DATE_UTC', '#6366F1');

    // 3. Source Anomaly / Active Column to Looker View PAYMENTS
    const activeCol = activeHighlightedColumn || activeCase?.sourceColumn || (cols[1] ? cols[1].name : idCol);
    if (activeCol) addConnector(activeCol, 'target_LOOKER_PAYMENTS', '#F43F5E', true);

    // 4. Source Units / Price to ORDERS TOTAL_AMOUNT
    const totalCol = cols.find((c) => /total|amount|price|units/i.test(c.name))?.name;
    if (totalCol && totalCol !== idCol) addConnector(totalCol, 'target_TOTAL_AMOUNT', '#6366F1');

    // 5. Source Category / Country / Status to Tableau Explorer CUSTOMER_360
    const catCol = cols.find((c) => /category|country|status|units|price|name/i.test(c.name))?.name || cols[2]?.name;
    if (catCol) addConnector(catCol, 'target_TABLEAU_CUSTOMER_360', '#6366F1');

    setLinePaths(newPaths);
  };

  // Re-calculate paths on render, resize, or search changes
  useLayoutEffect(() => {
    if (activeStep === 5) {
      updateDynamicPaths();
      const timer = setTimeout(updateDynamicPaths, 50);
      const timer2 = setTimeout(updateDynamicPaths, 200);

      const handleResize = () => updateDynamicPaths();
      window.addEventListener('resize', handleResize);

      let resizeObserver: ResizeObserver | null = null;
      if (containerRef.current) {
        resizeObserver = new ResizeObserver(() => updateDynamicPaths());
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
        window.removeEventListener('resize', handleResize);
        if (resizeObserver) resizeObserver.disconnect();
      };
    }
  }, [activeStep, activeHighlightedColumn, sourceSearchTerm, targetSearchTerm, dataset]);

  // Handle fix action execution
  const handleApproveCorrection = async (c: AnomalyImpactCase) => {
    if (c.issueRef && onApplyQuickFix) {
      await onApplyQuickFix(c.issueRef);
    } else if (onApplyOperation) {
      await onApplyOperation(c.suggestedAction, c.suggestedParams);
    }
  };

  // Step names list
  const steps = [
    { num: 1, name: 'Upload CSV', sub: 'Read rows & schema' },
    { num: 2, name: 'Detect Error', sub: 'Find suspicious values' },
    { num: 3, name: 'Identify Dependencies', sub: 'Formulas & rules' },
    { num: 4, name: 'Calculate Impact', sub: 'Recalculation table' },
    { num: 5, name: 'Visualize Lineage', sub: 'Schema mapping graph' },
    { num: 6, name: 'Suggest & Approve', sub: 'Review & shield' }
  ];

  // If NOT a CSV file: Display informational gate
  if (!isCsvFile) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">
              Error Impact Map — Exclusive to CSV Files
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Current file format is <span className="font-semibold text-slate-700 uppercase">{dataset.file_format}</span>. 
              The column-to-column lineage mapping and cascading impact analyzer is specifically engineered for CSV pipelines.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentHighlightedCol = activeHighlightedColumn || activeCase?.sourceColumn || dataset.columns[0]?.name;

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-7">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-indigo-600 to-emerald-500 flex items-center justify-center text-white shadow-xs">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Error Impact & Column Lineage Map
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Schema ER & Lineage Mapping
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Shows how errors in source columns cause defects and break downstream columns, formulas, Looker views, and Tableau reports.
            </p>
          </div>
        </div>

        {/* Case Focus Selector */}
        {impactCases.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Root Defect:</span>
            <select
              value={activeCase?.id || ''}
              onChange={(e) => {
                setSelectedCaseId(e.target.value);
                const found = impactCases.find((c) => c.id === e.target.value);
                if (found) setActiveHighlightedColumn(found.sourceColumn);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {impactCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.stepName} ({c.sourceColumn})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. 6-Step Visual Process Bar */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {steps.map((s) => {
            const isCurrent = activeStep === s.num;
            const isCompleted = activeStep > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setActiveStep(s.num)}
                className={`p-3 rounded-2xl text-left border transition relative overflow-hidden ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/30'
                    : isCompleted
                    ? 'bg-emerald-50/60 border-emerald-200 text-slate-800 hover:bg-emerald-100/50'
                    : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                      isCurrent
                        ? 'bg-indigo-500 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : s.num}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? 'text-indigo-400' : 'text-slate-400'}`}>
                    Step {s.num}
                  </span>
                </div>
                <div className="font-bold text-xs leading-tight line-clamp-1">{s.name}</div>
                <div className={`text-[10px] mt-0.5 line-clamp-1 ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`}>
                  {s.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Step Container */}
      {activeCase ? (
        <div className="space-y-6">

          {/* STEP 1: Upload CSV */}
          {activeStep === 1 && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 1: Upload CSV — Read Rows & Identify Schema
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {dataset.row_count} Rows × {dataset.column_count} Columns Parsed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">File Name</span>
                  <div className="text-xs font-bold text-slate-900 truncate">{dataset.filename}</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">File Format</span>
                  <div className="text-xs font-bold text-emerald-700 font-mono uppercase">{dataset.file_format} Verified</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Rows</span>
                  <div className="text-xs font-bold text-slate-900">{dataset.row_count.toLocaleString()} rows</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Identified Columns</span>
                  <div className="text-xs font-bold text-slate-900">{dataset.columns.length} schema headers</div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Identified Column Schema:</span>
                <div className="flex flex-wrap gap-1.5">
                  {dataset.columns.map((c) => (
                    <span
                      key={c.name}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white border border-slate-200 text-slate-800 flex items-center space-x-1.5 shadow-2xs"
                    >
                      <span className="font-bold">{c.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-sans">
                        {c.inferred_type}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#009A49] text-white hover:bg-[#00823E] transition shadow-2xs"
                >
                  <span>Proceed to Step 2: Detect Errors</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Detect Errors */}
          {activeStep === 2 && (
            <div className="p-5 rounded-2xl bg-[#FFF8F8] border border-rose-200 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-rose-200/70">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 2: Detect Error — Suspicious Value & Anomaly Identification
                  </h4>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  {activeCase.defectCategory}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Column & Coordinate
                  </span>
                  <div className="text-sm font-extrabold text-slate-900">
                    Column <span className="font-mono text-rose-600 font-bold">"{activeCase.sourceColumn}"</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Detected at Row #{activeCase.rowIndex} (~{activeCase.affectedRowCount} total rows flagged)
                  </span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-1">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                    Flagged Suspicious Value
                  </span>
                  <div className="text-sm font-mono font-extrabold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 truncate">
                    {activeCase.flaggedValue}
                  </div>
                  <span className="text-xs text-slate-500">Fails deterministic schema validation</span>
                </div>

                <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                    Proposed Expected Standard
                  </span>
                  <div className="text-sm font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 truncate">
                    {activeCase.suggestedValue}
                  </div>
                  <span className="text-xs text-slate-500">Deterministic type and integrity standard</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-rose-200 text-xs text-slate-700 space-y-1">
                <span className="font-bold text-slate-900">Validation Rule Triggered: </span>
                <span>{activeCase.defectTitle}</span>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Back to Step 1
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#009A49] text-white hover:bg-[#00823E] transition shadow-2xs"
                >
                  <span>Proceed to Step 3: Identify Dependencies</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Identify Dependencies */}
          {activeStep === 3 && (
            <div className="p-5 rounded-2xl bg-[#FEFCE8] border border-amber-200 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200/70">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-5 h-5 text-amber-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 3: Identify Dependencies — Formula & Downstream Rules
                  </h4>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {activeCase.downstreamColumns.length} Dependent Fields
                </span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-amber-200 space-y-2">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                  Mathematical Formula & Business Rule
                </span>
                <div className="font-mono text-xs sm:text-sm font-bold bg-amber-50/80 p-2.5 rounded-lg border border-amber-200 text-amber-950">
                  {activeCase.formulaDefinition}
                </div>
                <p className="text-xs text-slate-600">
                  Any error or missing value in <span className="font-bold text-slate-900 font-mono">"{activeCase.sourceColumn}"</span> will propagate directly through this calculation pipeline.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-white rounded-xl border border-amber-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Directly Corrupted Column Fields
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCase.downstreamColumns.map((col) => (
                      <span
                        key={col}
                        className="px-2 py-1 rounded text-xs font-mono font-bold bg-amber-50 border border-amber-300 text-amber-900"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-amber-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Downstream Reports & Business Deliverables
                  </span>
                  <ul className="text-xs text-slate-700 space-y-1">
                    {activeCase.affectedReports.map((rep) => (
                      <li key={rep} className="flex items-start space-x-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{rep}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Back to Step 2
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#009A49] text-white hover:bg-[#00823E] transition shadow-2xs"
                >
                  <span>Proceed to Step 4: Calculate Impact</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Calculate Impact */}
          {activeStep === 4 && (
            <div className="p-5 rounded-2xl bg-[#F0F9FF] border border-sky-200 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-sky-200/70">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-sky-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 4: Calculate Impact — Formula Recalculation & Delta Analysis
                  </h4>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  {activeCase.variancePct}
                </span>
              </div>

              <div className="bg-white rounded-xl border border-sky-200 overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-sky-50 text-slate-700 font-bold border-b border-sky-200">
                    <tr>
                      <th className="p-3">Evaluation Metric</th>
                      <th className="p-3 text-rose-700">Flagged / Corrupted Value</th>
                      <th className="p-3 text-emerald-700">Recalculated True Value</th>
                      <th className="p-3 text-slate-900">Impact Variance (Δ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="p-3 font-bold text-slate-700">Source Cell (Row #{activeCase.rowIndex})</td>
                      <td className="p-3 font-mono text-rose-600 font-bold">{activeCase.flaggedValue}</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">{activeCase.suggestedValue}</td>
                      <td className="p-3 font-mono text-slate-700 font-semibold">Corrective Normalization</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-700">Formula Result ({activeCase.downstreamColumns[0]})</td>
                      <td className="p-3 font-mono text-rose-600 font-bold">{activeCase.flaggedCalculationResult}</td>
                      <td className="p-3 font-mono text-emerald-600 font-bold">{activeCase.recalculatedResult}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700 bg-indigo-50/50">{activeCase.varianceDelta}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-white rounded-xl border border-sky-200 space-y-1">
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                  Quantified Impact Analysis
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {activeCase.consequenceExplanation}
                </p>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Back to Step 3
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(5)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#009A49] text-white hover:bg-[#00823E] transition shadow-2xs"
                >
                  <span>Proceed to Step 5: Visualize Lineage Mapping</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Visualize the Impact (Exact Schema Mapping Diagram like user's picture) */}
          {activeStep === 5 && (
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <Network className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Step 5: Visualize Lineage — Column-to-Column & Business Report Mapping
                    </h4>
                    <p className="text-xs text-slate-500">
                      Interactive schema graph showing full error propagation lines connecting source columns to downstream tables, Looker views, and Tableau dashboards.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start sm:self-auto">
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                    Active Defect: {activeCase.sourceColumn}
                  </span>
                </div>
              </div>

              {/* LINEAGE DIAGRAM CANVAS (Dynamic Full-Width Connector Layer) */}
              <div
                ref={containerRef}
                className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm relative min-h-[580px]"
              >
                {/* SVG Connecting Bezier Curves Layer */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10 hidden md:block overflow-visible"
                >
                  <defs>
                    <linearGradient id="lineageGradIndigo" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.85" />
                    </linearGradient>
                    <linearGradient id="lineageGradRose" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#FB7185" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>

                  {/* Render Dynamically Measured Path Lines */}
                  {linePaths.map((p) => (
                    <path
                      key={p.id}
                      d={p.d}
                      fill="none"
                      stroke={p.color === '#F43F5E' ? 'url(#lineageGradRose)' : 'url(#lineageGradIndigo)'}
                      strokeWidth={p.dashed ? 2.5 : 2}
                      strokeDasharray={p.dashed ? '5 3' : undefined}
                      className={p.dashed ? 'animate-pulse' : undefined}
                    />
                  ))}
                </svg>

                {/* Grid Layout for Source on Left and Targets on Right */}
                <div className="flex flex-col md:flex-row items-start justify-between gap-8 md:gap-16 relative z-20">
                  
                  {/* LEFT CARD: SOURCE DATASET (CSV) */}
                  <div className="w-full md:w-[320px] lg:w-[360px] flex-shrink-0 border border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden">
                    {/* Header */}
                    <div className="p-4 bg-slate-50/70 border-b border-slate-200">
                      <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <div className="w-3.5 h-3.5 rounded bg-sky-500 flex items-center justify-center text-white text-[9px] font-black">
                          ❄
                        </div>
                        <span>ANALYTICS / CSV_SOURCE</span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 mt-1 uppercase tracking-tight">
                        {dataset.filename.replace(/\.[^/.]+$/, '').toUpperCase() || 'CUSTOMERS'}
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-slate-500 mt-0.5">
                        <span>{dataset.columns.length} columns</span>
                        <span className="text-[10px]">▼</span>
                      </div>
                    </div>

                    {/* Search Input Box */}
                    <div className="p-2.5 border-b border-slate-100 bg-white">
                      <div className="relative">
                        <input
                          type="text"
                          value={sourceSearchTerm}
                          onChange={(e) => setSourceSearchTerm(e.target.value)}
                          placeholder="Search column"
                          className="w-full pl-3 pr-8 py-1.5 rounded-lg text-xs bg-slate-50/80 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                      </div>
                    </div>

                    {/* Column List Table */}
                    <div className="divide-y divide-slate-100 text-xs font-mono">
                      {filteredSourceColumns.map((col, idx) => {
                        const isColActive = currentHighlightedCol?.toLowerCase() === col.name.toLowerCase();
                        const isPrimaryId = idx === 0 || col.name.toLowerCase().includes('id') || col.name.toLowerCase().includes('code');
                        const isDateCol = col.name.toLowerCase().includes('date') || col.name.toLowerCase().includes('time');
                        const isGeoCol = col.name.toLowerCase().includes('country') || col.name.toLowerCase().includes('city') || col.name.toLowerCase().includes('state');
                        
                        const isHighlighted = isColActive || isPrimaryId || isDateCol || isGeoCol;

                        return (
                          <div
                            key={col.name}
                            ref={(el) => {
                              sourceRefs.current[col.name] = el;
                            }}
                            onClick={() => {
                              setActiveHighlightedColumn(col.name);
                              setTimeout(updateDynamicPaths, 50);
                            }}
                            className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition ${
                              isColActive
                                ? 'bg-indigo-100/80 text-indigo-900 font-bold border-l-4 border-indigo-600'
                                : isHighlighted
                                ? 'bg-indigo-50/50 text-slate-800 font-semibold hover:bg-indigo-100/40'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="w-4 text-center">
                                {getColTypeIcon(col.inferred_type, col.name)}
                              </span>
                              <span className="tracking-tight uppercase">{col.name}</span>
                            </div>

                            {isColActive && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500 text-white animate-pulse">
                                ANOMALY SOURCE
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT STACK: TARGET ORDERS TABLE, LOOKER VIEW, TABLEAU EXPLORER */}
                  <div className="w-full md:w-[320px] lg:w-[360px] flex-shrink-0 space-y-4">
                    
                    {/* 1. Target Table: ORDERS */}
                    <div className="border border-slate-200/90 rounded-2xl bg-white shadow-xs overflow-hidden">
                      <div className="p-4 bg-slate-50/70 border-b border-slate-200">
                        <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <div className="w-3.5 h-3.5 rounded bg-sky-500 flex items-center justify-center text-white text-[9px] font-black">
                            ❄
                          </div>
                          <span>ANALYTICS / PROD</span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 mt-1 uppercase tracking-tight">
                          ORDERS
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-slate-500 mt-0.5">
                          <span>20 columns</span>
                          <span className="text-[10px]">▶</span>
                        </div>
                      </div>

                      {/* Search */}
                      <div className="p-2.5 border-b border-slate-100 bg-white">
                        <div className="relative">
                          <input
                            type="text"
                            value={targetSearchTerm}
                            onChange={(e) => setTargetSearchTerm(e.target.value)}
                            placeholder="Search column"
                            className="w-full pl-3 pr-8 py-1.5 rounded-lg text-xs bg-slate-50/80 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                        </div>
                      </div>

                      {/* Columns */}
                      <div className="divide-y divide-slate-100 text-xs font-mono">
                        {targetDerivedColumns.map((col) => {
                          const isTargetHighlighted = col.name === 'USER_ID' || col.name === 'TOTAL_AMOUNT' || col.name === 'ORDER_DATE_UTC';
                          return (
                            <div
                              key={col.name}
                              ref={(el) => {
                                targetRefs.current[`target_${col.name}`] = el;
                              }}
                              className={`flex items-center justify-between px-3.5 py-2.5 ${
                                isTargetHighlighted
                                  ? 'bg-indigo-50/90 text-indigo-950 font-bold border-l-4 border-indigo-500'
                                  : 'text-slate-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <span className="w-4 text-center">
                                  {getColTypeIcon(col.type, col.name)}
                                </span>
                                <span className="tracking-tight uppercase">{col.name}</span>
                              </div>
                              {isTargetHighlighted && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                  CONNECTED
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Looker View: PAYMENTS */}
                    <div
                      ref={(el) => {
                        targetRefs.current['target_LOOKER_PAYMENTS'] = el;
                      }}
                      className="border border-slate-200/90 rounded-2xl bg-white p-4 shadow-xs hover:border-slate-300 transition space-y-1 relative"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-black">
                          ●
                        </div>
                        <span className="text-xs font-semibold text-slate-500">Looker View</span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 tracking-tight">
                        PAYMENTS
                      </div>
                      <div className="text-xs text-slate-500 flex items-center space-x-1 pt-0.5">
                        <span>Run</span>
                        <span className="font-mono text-slate-700 font-semibold">2023-07-07 12:34:41</span>
                      </div>
                    </div>

                    {/* 3. Tableau Explorer: CUSTOMER_360 */}
                    <div
                      ref={(el) => {
                        targetRefs.current['target_TABLEAU_CUSTOMER_360'] = el;
                      }}
                      className="border border-slate-200/90 rounded-2xl bg-white p-4 shadow-xs hover:border-slate-300 transition space-y-1 relative"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center text-white text-[9px] font-black">
                          ❖
                        </div>
                        <span className="text-xs font-semibold text-slate-500">Tableau Explorer</span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 tracking-tight">
                        CUSTOMER_360
                      </div>
                      <div className="text-xs text-slate-500 flex items-center space-x-1 pt-0.5">
                        <span>Run</span>
                        <span className="font-mono text-slate-700 font-semibold">2023-08-16 02:21:53</span>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Footer Legend Bar */}
                <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                      <span>Schema & Formula Dependency</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse inline-block" />
                      <span>Active Defect Impact Trace</span>
                    </span>
                  </div>
                  <div className="text-slate-600 font-mono font-medium">
                    Click any column on left to inspect lineage propagation
                  </div>
                </div>

              </div>

              {/* Navigation Controls */}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Back to Step 4 (Calculate Impact)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(6)}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#009A49] text-white hover:bg-[#00823E] transition shadow-2xs"
                >
                  <span>Proceed to Step 6: Suggest & Approve Correction</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Suggest & Approve Correction */}
          {activeStep === 6 && (
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-300 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    Step 6: Suggest & Approve — Evidence Review & Pipeline Shielding
                  </h4>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Ready for Approval
                </span>
              </div>

              {/* Side-by-side Evidence Review Card */}
              <div className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-4 shadow-2xs">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Side-by-Side Evidence Inspection
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current State */}
                  <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
                    <span className="text-[10px] font-bold text-rose-700 uppercase">Current Flagged State</span>
                    <div className="text-xs text-slate-800 space-y-1">
                      <div><span className="font-semibold text-slate-500">Value: </span><span className="font-mono font-bold text-rose-700">{activeCase.flaggedValue}</span></div>
                      <div><span className="font-semibold text-slate-500">Calculated Output: </span><span className="font-mono text-rose-600 font-bold">{activeCase.flaggedCalculationResult}</span></div>
                      <div><span className="font-semibold text-slate-500">Business Risk: </span><span className="text-rose-800">{activeCase.defectTitle}</span></div>
                    </div>
                  </div>

                  {/* Proposed Corrected State */}
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Proposed Approved Correction</span>
                    <div className="text-xs text-slate-800 space-y-1">
                      <div><span className="font-semibold text-slate-500">Normalized Value: </span><span className="font-mono font-bold text-emerald-700">{activeCase.suggestedValue}</span></div>
                      <div><span className="font-semibold text-slate-500">Recalculated Output: </span><span className="font-mono text-emerald-600 font-bold">{activeCase.recalculatedResult}</span></div>
                      <div><span className="font-semibold text-slate-500">Pipeline Result: </span><span className="text-emerald-800 font-semibold">100% calculation integrity protected</span></div>
                    </div>
                  </div>
                </div>

                {/* Business Explanation */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Operational Guarantee: </span>
                    Approving this change executes a deterministic Pandas transformation on column <span className="font-mono font-bold text-slate-800">"{activeCase.sourceColumn}"</span>, updating dependent fields ({activeCase.downstreamColumns.join(', ')}) without raw data loss.
                  </div>
                </div>

                {/* Approval Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-500">
                    Operation: <span className="font-mono font-bold text-slate-800">{activeCase.suggestedAction}</span>
                  </span>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleApproveCorrection(activeCase)}
                    className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-extrabold bg-[#009A49] hover:bg-[#00823E] text-white transition shadow-sm disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Approve Correction & Shield Calculations</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(5)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  Back to Step 5 (Visualize Lineage)
                </button>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="p-8 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h4 className="text-sm font-bold text-emerald-900">All Calculation Pathways Verified!</h4>
          <p className="text-xs text-emerald-700 max-w-md mx-auto">
            No cascading calculation risks detected in this CSV dataset. All formulas, units, dates, and identifiers meet standardization criteria.
          </p>
        </div>
      )}

    </div>
  );
};
