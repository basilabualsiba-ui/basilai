// Database Explorer Component - Browse all tables with columns and sample data

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Database, Search, Table2, ArrowUpDown } from 'lucide-react';
import { TABLE_CATEGORIES, type TableInfo, type ColumnInfo } from '@/types/assistant';

const CATEGORY_LABELS: Record<string, string> = {
  financial: '💰 مالية',
  gym: '💪 جيم',
  food: '🍽️ أكل',
  prayer: '🕌 صلاة',
  supplements: '💊 مكملات',
  dreams: '🌟 أحلام',
  schedule: '📅 جدول',
  assistant: '🤖 مساعد',
  media: '🎵 ميديا',
  system: '⚙️ نظام',
};

type SortMode = 'name' | 'rows' | 'category';

export function DatabaseExplorer() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [sampleData, setSampleData] = useState<Record<string, any[]>>({});
  const [sortMode, setSortMode] = useState<SortMode>('category');
  const [groupByCategory, setGroupByCategory] = useState(true);

  useEffect(() => {
    loadSchema();
  }, []);

  const loadSchema = async () => {
    setLoading(true);
    try {
      // Get all tables from the types we know about
      const knownTables = Object.keys(TABLE_CATEGORIES);
      const tableInfos: TableInfo[] = [];

      for (const tableName of knownTables) {
        try {
          // Get columns by doing a select with limit 0
          const { data, error } = await supabase.from(tableName as any).select('*').limit(0);
          
          // Get count
          const { count } = await supabase.from(tableName as any).select('*', { count: 'exact', head: true });
          
          if (!error) {
            // Infer columns from the first response or data keys
            const columns: ColumnInfo[] = [];
            if (data && data.length > 0) {
              Object.keys(data[0]).forEach(key => {
                columns.push({
                  name: key,
                  type: typeof data[0][key] === 'number' ? 'number' : 
                        typeof data[0][key] === 'boolean' ? 'boolean' : 'text',
                  isNullable: true,
                  defaultValue: null,
                });
              });
            }
            
            tableInfos.push({
              name: tableName,
              columns,
              rowCount: count || 0,
              category: TABLE_CATEGORIES[tableName] || 'system',
            });
          }
        } catch {
          // Skip tables that can't be accessed
        }
      }

      setTables(tableInfos);
    } catch (error) {
      console.error('Error loading schema:', error);
    }
    setLoading(false);
  };

  const loadSampleData = async (tableName: string) => {
    if (sampleData[tableName]) return;
    
    try {
      const { data } = await supabase.from(tableName as any).select('*').limit(5);
      setSampleData(prev => ({ ...prev, [tableName]: data || [] }));
    } catch {
      setSampleData(prev => ({ ...prev, [tableName]: [] }));
    }
  };

  const toggleTable = (tableName: string) => {
    if (expandedTable === tableName) {
      setExpandedTable(null);
    } else {
      setExpandedTable(tableName);
      loadSampleData(tableName);
    }
  };

  const filtered = tables.filter(t => 
    !search || t.name.includes(search.toLowerCase()) || t.category.includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'rows') return b.rowCount - a.rowCount;
    if (sortMode === 'name') return a.name.localeCompare(b.name);
    return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
  });

  const grouped = groupByCategory 
    ? sorted.reduce((acc, t) => {
        if (!acc[t.category]) acc[t.category] = [];
        acc[t.category].push(t);
        return acc;
      }, {} as Record<string, TableInfo[]>)
    : { all: sorted };

  if (loading) {
    return <div className="flex items-center justify-center py-8 text-muted-foreground">جاري تحميل قاعدة البيانات...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search & Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في الجداول..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortMode(s => s === 'rows' ? 'name' : s === 'name' ? 'category' : 'rows')}
        >
          <ArrowUpDown className="h-4 w-4 mr-1" />
          {sortMode === 'rows' ? 'حجم' : sortMode === 'name' ? 'اسم' : 'فئة'}
        </Button>
        <Button
          variant={groupByCategory ? 'default' : 'outline'}
          size="sm"
          onClick={() => setGroupByCategory(!groupByCategory)}
        >
          تجميع
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary">{tables.length} جدول</Badge>
        <Badge variant="secondary">{tables.reduce((s, t) => s + t.rowCount, 0).toLocaleString()} صف</Badge>
      </div>

      {/* Tables */}
      <ScrollArea className="h-[60vh]">
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, categoryTables]) => (
            <div key={category}>
              {groupByCategory && category !== 'all' && (
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {CATEGORY_LABELS[category] || category} ({categoryTables.length})
                </h3>
              )}
              <div className="space-y-1">
                {categoryTables.map(table => (
                  <div key={table.name} className="border rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => toggleTable(table.name)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedTable === table.name ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Table2 className="h-4 w-4 text-primary" />
                        <span className="font-mono text-sm">{table.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{table.columns.length} عمود</Badge>
                        <Badge variant="secondary" className="text-xs">{table.rowCount} صف</Badge>
                      </div>
                    </button>

                    {expandedTable === table.name && (
                      <div className="border-t p-3 bg-muted/20 space-y-3">
                        {/* Columns */}
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2">الأعمدة</h4>
                          <div className="flex flex-wrap gap-1">
                            {table.columns.map(col => (
                              <Badge key={col.name} variant="outline" className="text-xs font-mono">
                                {col.name}
                                <span className="text-muted-foreground ml-1">({col.type})</span>
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Sample Data */}
                        {sampleData[table.name] && sampleData[table.name].length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted-foreground mb-2">بيانات تجريبية</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr>
                                    {Object.keys(sampleData[table.name][0]).slice(0, 6).map(key => (
                                      <th key={key} className="border border-border p-1 bg-muted font-mono text-left">{key}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sampleData[table.name].map((row, i) => (
                                    <tr key={i}>
                                      {Object.values(row).slice(0, 6).map((val, j) => (
                                        <td key={j} className="border border-border p-1 max-w-[150px] truncate">
                                          {val === null ? <span className="text-muted-foreground">null</span> : String(val)}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
