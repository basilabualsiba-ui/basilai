// Query Editor - Visual query builder for creating/editing assistant queries

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Code, Play, Save } from 'lucide-react';
import { TABLE_CATEGORIES, type QueryConfig, type QueryFilter, type SavedQuery } from '@/types/assistant';
import { queryExecutor } from '@/services/LocalAssistant/QueryExecutor';
import { variableResolver } from '@/services/LocalAssistant/VariableResolver';
import { toast } from 'sonner';

const OPERATORS = [
  { value: 'eq', label: '= يساوي' },
  { value: 'neq', label: '≠ لا يساوي' },
  { value: 'gt', label: '> أكبر' },
  { value: 'gte', label: '≥ أكبر أو يساوي' },
  { value: 'lt', label: '< أصغر' },
  { value: 'lte', label: '≤ أصغر أو يساوي' },
  { value: 'like', label: 'يحتوي' },
  { value: 'ilike', label: 'يحتوي (بدون حساسية)' },
  { value: 'not_null', label: 'غير فارغ' },
  { value: 'is_null', label: 'فارغ' },
];

const AGG_TYPES = [
  { value: '', label: 'بدون' },
  { value: 'sum', label: 'مجموع' },
  { value: 'count', label: 'عدد' },
  { value: 'avg', label: 'متوسط' },
  { value: 'max', label: 'أعلى' },
  { value: 'min', label: 'أقل' },
];

const ALL_TABLES = Object.keys(TABLE_CATEGORIES);

interface QueryEditorProps {
  initialQuery?: SavedQuery;
  onSave: (query: Partial<SavedQuery>) => Promise<void>;
  onCancel?: () => void;
}

export function QueryEditor({ initialQuery, onSave, onCancel }: QueryEditorProps) {
  const [queryName, setQueryName] = useState(initialQuery?.query_name || '');
  const [category, setCategory] = useState(initialQuery?.category || 'financial');
  const [purpose, setPurpose] = useState(initialQuery?.purpose || '');
  const [triggerPatterns, setTriggerPatterns] = useState<string[]>(initialQuery?.trigger_patterns || ['']);
  const [table, setTable] = useState(initialQuery?.query_config?.table || '');
  const [selectColumns, setSelectColumns] = useState<string[]>(initialQuery?.query_config?.select || ['*']);
  const [filters, setFilters] = useState<QueryFilter[]>(initialQuery?.query_config?.filters || []);
  const [joins, setJoins] = useState<{ table: string; on: string }[]>(initialQuery?.query_config?.joins || []);
  const [aggType, setAggType] = useState(initialQuery?.query_config?.aggregation?.type || '');
  const [aggColumn, setAggColumn] = useState(initialQuery?.query_config?.aggregation?.column || '');
  const [groupBy, setGroupBy] = useState<string[]>(initialQuery?.query_config?.group_by || []);
  const [orderByCol, setOrderByCol] = useState(initialQuery?.query_config?.order_by?.column || '');
  const [orderAsc, setOrderAsc] = useState(initialQuery?.query_config?.order_by?.ascending ?? false);
  const [limit, setLimit] = useState(initialQuery?.query_config?.limit || 0);
  const [outputTemplate, setOutputTemplate] = useState(initialQuery?.output_template || '');
  const [outputMode, setOutputMode] = useState<'text' | 'table'>(initialQuery?.output_mode || 'text');
  const [actionType, setActionType] = useState<'query' | 'input'>(initialQuery?.action_type || 'query');
  const [codeMode, setCodeMode] = useState(!!initialQuery?.filter_code || !!initialQuery?.result_code);
  const [filterCode, setFilterCode] = useState(initialQuery?.filter_code || '');
  const [resultCode, setResultCode] = useState(initialQuery?.result_code || '');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const addTrigger = () => setTriggerPatterns(p => [...p, '']);
  const removeTrigger = (i: number) => setTriggerPatterns(p => p.filter((_, idx) => idx !== i));
  const updateTrigger = (i: number, val: string) => setTriggerPatterns(p => p.map((t, idx) => idx === i ? val : t));

  const addFilter = () => setFilters(f => [...f, { column: '', operator: 'eq', value: '' }]);
  const removeFilter = (i: number) => setFilters(f => f.filter((_, idx) => idx !== i));
  const updateFilter = (i: number, field: keyof QueryFilter, val: any) => {
    setFilters(f => f.map((fl, idx) => idx === i ? { ...fl, [field]: val } : fl));
  };

  const addJoin = () => setJoins(j => [...j, { table: '', on: '' }]);
  const removeJoin = (i: number) => setJoins(j => j.filter((_, idx) => idx !== i));

  const buildConfig = (): QueryConfig => {
    const config: QueryConfig = {
      table,
      select: selectColumns.filter(Boolean),
    };
    if (joins.length > 0) config.joins = joins.filter(j => j.table && j.on);
    if (filters.length > 0) config.filters = filters.filter(f => f.column);
    if (aggType) config.aggregation = { type: aggType as any, column: aggColumn };
    if (groupBy.length > 0) config.group_by = groupBy.filter(Boolean);
    if (orderByCol) config.order_by = { column: orderByCol, ascending: orderAsc };
    if (limit > 0) config.limit = limit;
    return config;
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const config = buildConfig();
      const mockQuery: SavedQuery = {
        id: 'test',
        query_name: queryName || 'test',
        category,
        purpose,
        trigger_patterns: triggerPatterns,
        query_config: config,
        output_template: outputTemplate || null,
        output_mode: outputMode,
        action_type: actionType,
        filter_code: filterCode || null,
        result_code: resultCode || null,
        is_active: true,
        usage_count: 0,
        created_at: '',
        updated_at: '',
      };
      const result = await queryExecutor.execute(mockQuery, {});

      // Apply custom code if exists
      let finalData = result.data;
      if (filterCode) {
        try {
          const fn = new Function('data', 'variables', filterCode);
          finalData = fn(finalData, await variableResolver.resolveAllVariables({}));
        } catch (e) {
          toast.error('خطأ في كود الفلتر: ' + (e as Error).message);
        }
      }

      setTestResult({ ...result, data: finalData });
      toast.success(`تم تنفيذ الاستعلام: ${finalData.length} نتيجة`);
    } catch (error) {
      toast.error('خطأ في تنفيذ الاستعلام');
      setTestResult({ error: (error as Error).message });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    if (!queryName || !table || !purpose) {
      toast.error('الرجاء تعبئة الحقول المطلوبة');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...(initialQuery ? { id: initialQuery.id } : {}),
        query_name: queryName,
        category,
        purpose,
        trigger_patterns: triggerPatterns.filter(Boolean),
        query_config: buildConfig(),
        output_template: outputTemplate || null,
        output_mode: outputMode,
        action_type: actionType,
        filter_code: filterCode || null,
        result_code: resultCode || null,
        is_active: true,
      });
      toast.success('تم الحفظ ✅');
    } catch {
      toast.error('خطأ في الحفظ');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Basic Info */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">معلومات أساسية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">اسم الاستعلام *</Label>
              <Input value={queryName} onChange={e => setQueryName(e.target.value)} placeholder="spending_today" className="font-mono text-sm" />
            </div>
            <div>
              <Label className="text-xs">الفئة *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['financial', 'gym', 'food', 'prayer', 'supplements', 'dreams', 'schedule', 'general'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">الغرض *</Label>
            <Input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Total spending for today" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">نوع الإخراج</Label>
              <Select value={outputMode} onValueChange={v => setOutputMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">سطر واحد</SelectItem>
                  <SelectItem value="table">جدول</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">نوع الإجراء</Label>
              <Select value={actionType} onValueChange={v => setActionType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="query">استعلام (قراءة)</SelectItem>
                  <SelectItem value="input">إدخال (كتابة)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trigger Patterns */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">أنماط التفعيل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {triggerPatterns.map((p, i) => (
            <div key={i} className="flex gap-2">
              <Input value={p} onChange={e => updateTrigger(i, e.target.value)} placeholder="كم صرفت اليوم" />
              {triggerPatterns.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeTrigger(i)}><X className="h-4 w-4" /></Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addTrigger}><Plus className="h-3 w-3 mr-1" /> إضافة نمط</Button>
        </CardContent>
      </Card>

      {/* Query Config */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">إعداد الاستعلام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">الجدول *</Label>
            <Select value={table} onValueChange={setTable}>
              <SelectTrigger><SelectValue placeholder="اختر جدول" /></SelectTrigger>
              <SelectContent>
                {ALL_TABLES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">الأعمدة (مفصولة بفواصل)</Label>
            <Input value={selectColumns.join(', ')} onChange={e => setSelectColumns(e.target.value.split(',').map(s => s.trim()))} placeholder="*, amount, name" className="font-mono text-sm" />
          </div>

          {/* Joins */}
          <div>
            <Label className="text-xs">الربط (Joins)</Label>
            {joins.map((j, i) => (
              <div key={i} className="flex gap-2 mt-1">
                <Select value={j.table} onValueChange={v => setJoins(js => js.map((jj, idx) => idx === i ? { ...jj, table: v } : jj))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="جدول" /></SelectTrigger>
                  <SelectContent>{ALL_TABLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Input value={j.on} onChange={e => setJoins(js => js.map((jj, idx) => idx === i ? { ...jj, on: e.target.value } : jj))} placeholder="category_id" className="flex-1 font-mono text-sm" />
                <Button variant="ghost" size="icon" onClick={() => removeJoin(i)}><X className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-1" onClick={addJoin}><Plus className="h-3 w-3 mr-1" /> ربط</Button>
          </div>

          {/* Filters */}
          <div>
            <Label className="text-xs">الفلاتر</Label>
            {filters.map((f, i) => (
              <div key={i} className="flex gap-1 mt-1 items-center">
                <Input value={f.column} onChange={e => updateFilter(i, 'column', e.target.value)} placeholder="column" className="flex-1 font-mono text-xs" />
                <Select value={f.operator} onValueChange={v => updateFilter(i, 'operator', v)}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input value={String(f.value ?? '')} onChange={e => updateFilter(i, 'value', e.target.value)} placeholder="قيمة أو {variable}" className="flex-1 font-mono text-xs" />
                <Button variant="ghost" size="icon" onClick={() => removeFilter(i)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-1" onClick={addFilter}><Plus className="h-3 w-3 mr-1" /> فلتر</Button>
          </div>

          {/* Aggregation */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">التجميع</Label>
              <Select value={aggType} onValueChange={setAggType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AGG_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {aggType && (
              <div>
                <Label className="text-xs">عمود التجميع</Label>
                <Input value={aggColumn} onChange={e => setAggColumn(e.target.value)} placeholder="amount" className="font-mono text-sm" />
              </div>
            )}
          </div>

          {/* Group By, Order By, Limit */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">تجميع حسب</Label>
              <Input value={groupBy.join(', ')} onChange={e => setGroupBy(e.target.value.split(',').map(s => s.trim()))} className="font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs">ترتيب حسب</Label>
              <Input value={orderByCol} onChange={e => setOrderByCol(e.target.value)} className="font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs">حد أقصى</Label>
              <Input type="number" value={limit || ''} onChange={e => setLimit(parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Output Template */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">قالب الإخراج</CardTitle>
        </CardHeader>
        <CardContent>
          <Input value={outputTemplate} onChange={e => setOutputTemplate(e.target.value)} placeholder="صرفت اليوم {total} شيكل" dir="rtl" />
          <p className="text-xs text-muted-foreground mt-1">استخدم {'{total}'}, {'{count}'}, {'{name}'} كمتغيرات</p>
        </CardContent>
      </Card>

      {/* Code Mode */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Code className="h-4 w-4" /> وضع الكود
            </CardTitle>
            <Switch checked={codeMode} onCheckedChange={setCodeMode} />
          </div>
        </CardHeader>
        {codeMode && (
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">كود الفلتر (يستقبل data, variables)</Label>
              <Textarea value={filterCode} onChange={e => setFilterCode(e.target.value)} placeholder="return data.filter(row => row.amount > 100)" className="font-mono text-xs" rows={3} dir="ltr" />
            </div>
            <div>
              <Label className="text-xs">كود النتيجة (يستقبل data, variables)</Label>
              <Textarea value={resultCode} onChange={e => setResultCode(e.target.value)} placeholder='const total = data.reduce((s, r) => s + r.amount, 0); return `صرفت ${total} شيكل`' className="font-mono text-xs" rows={3} dir="ltr" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleTest} disabled={!table || testing} variant="outline" className="flex-1">
          <Play className="h-4 w-4 mr-1" /> {testing ? 'جاري...' : 'اختبار'}
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          <Save className="h-4 w-4 mr-1" /> {saving ? 'جاري...' : 'حفظ'}
        </Button>
        {onCancel && <Button onClick={onCancel} variant="ghost">إلغاء</Button>}
      </div>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-xs">نتيجة الاختبار</CardTitle>
          </CardHeader>
          <CardContent>
            {testResult.error ? (
              <p className="text-destructive text-sm">{testResult.error}</p>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">{testResult.data?.length || 0} نتيجة</p>
                {testResult.aggregations && Object.entries(testResult.aggregations).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="mr-1">{k}: {String(v)}</Badge>
                ))}
                {testResult.data?.length > 0 && (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          {Object.keys(testResult.data[0]).filter(k => k !== '_rows').slice(0, 6).map(k => (
                            <th key={k} className="border border-border p-1 bg-muted font-mono">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {testResult.data.slice(0, 5).map((row: any, i: number) => (
                          <tr key={i}>
                            {Object.entries(row).filter(([k]) => k !== '_rows').slice(0, 6).map(([k, v], j) => (
                              <td key={j} className="border border-border p-1 max-w-[120px] truncate">
                                {v === null ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
