// Assistant Manager Page - Query management, DB explorer, synonyms, testing

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, Trash2, Edit, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { queryLibrary } from '@/services/LocalAssistant/QueryLibrary';
import { localAssistant } from '@/services/LocalAssistant';
import { QueryEditor } from '@/components/assistant/QueryEditor';
import { DatabaseExplorer } from '@/components/assistant/DatabaseExplorer';
import { QueryTester } from '@/components/assistant/QueryTester';
import { SynonymManager } from '@/components/assistant/SynonymManager';
import { PendingQueriesManager } from '@/components/assistant/PendingQueriesManager';
import type { SavedQuery } from '@/types/assistant';

const CATEGORY_EMOJI: Record<string, string> = {
  financial: '💰', gym: '💪', food: '🍽️', prayer: '🕌',
  supplements: '💊', dreams: '🌟', schedule: '📅', general: '📊',
};

export default function AssistantManager() {
  const navigate = useNavigate();
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
  const [showAddNew, setShowAddNew] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await localAssistant.initialize();
    await queryLibrary.loadQueries();
    
    // Load ALL queries including inactive
    const { data } = await supabase.from('assistant_queries').select('*').order('category').order('usage_count', { ascending: false });
    setQueries((data || []).map(q => ({
      ...q,
      query_config: q.query_config as any,
      output_mode: (q as any).output_mode || 'text',
      action_type: (q as any).action_type || 'query',
      filter_code: (q as any).filter_code || null,
      result_code: (q as any).result_code || null,
    })) as SavedQuery[]);

    // Get pending count
    const { count } = await supabase.from('assistant_pending_queries').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    setPendingCount(count || 0);
    
    setLoading(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('assistant_queries').update({ is_active: active }).eq('id', id);
    setQueries(qs => qs.map(q => q.id === id ? { ...q, is_active: active } : q));
    toast.success(active ? 'تم التفعيل' : 'تم التعطيل');
  };

  const deleteQuery = async (id: string) => {
    await supabase.from('assistant_queries').delete().eq('id', id);
    setQueries(qs => qs.filter(q => q.id !== id));
    toast.success('تم الحذف');
  };

  const handleSave = async (queryData: Partial<SavedQuery>) => {
    if (queryData.id) {
      // Update
      const { id, ...updates } = queryData;
      await supabase.from('assistant_queries').update({
        ...updates,
        query_config: updates.query_config as any,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    } else {
      // Insert
      await supabase.from('assistant_queries').insert({
        query_name: queryData.query_name!,
        category: queryData.category!,
        purpose: queryData.purpose!,
        trigger_patterns: queryData.trigger_patterns!,
        query_config: queryData.query_config as any,
        output_template: queryData.output_template,
        is_active: queryData.is_active ?? true,
      });
    }
    setEditingQuery(null);
    setShowAddNew(false);
    loadData();
    await localAssistant.reload();
  };

  const filtered = queries.filter(q =>
    !search || q.query_name.includes(search) || q.purpose.includes(search) || q.trigger_patterns.some(p => p.includes(search))
  );

  const grouped = filtered.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, SavedQuery[]>);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">🤖 إدارة المساعد</h1>
            <p className="text-xs text-muted-foreground">{queries.length} استعلام</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs defaultValue="queries" className="space-y-4">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="queries" className="text-xs">الاستعلامات</TabsTrigger>
            <TabsTrigger value="add" className="text-xs">إضافة</TabsTrigger>
            <TabsTrigger value="explorer" className="text-xs">قاعدة البيانات</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              اقتراحات {pendingCount > 0 && <Badge variant="destructive" className="mr-1 text-[10px] h-4 min-w-4">{pendingCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="synonyms" className="text-xs">مرادفات</TabsTrigger>
          </TabsList>

          {/* Tab 1: Saved Queries */}
          <TabsContent value="queries" className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="pr-9" />
              </div>
            </div>

            {editingQuery ? (
              <QueryEditor initialQuery={editingQuery} onSave={handleSave} onCancel={() => setEditingQuery(null)} />
            ) : (
              <ScrollArea className="h-[65vh]">
                <div className="space-y-4">
                  {Object.entries(grouped).map(([cat, catQueries]) => (
                    <div key={cat}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        {CATEGORY_EMOJI[cat] || '📊'} {cat} ({catQueries.length})
                      </h3>
                      <div className="space-y-1">
                        {catQueries.map(q => (
                          <Card key={q.id} className={!q.is_active ? 'opacity-50' : ''}>
                            <CardContent className="py-2 px-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-semibold truncate">{q.query_name}</span>
                                    <Badge variant="outline" className="text-[10px]">{q.usage_count}x</Badge>
                                    {q.output_mode === 'table' && <Badge variant="secondary" className="text-[10px]">جدول</Badge>}
                                    {q.action_type === 'input' && <Badge className="text-[10px]">إدخال</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{q.purpose}</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {q.trigger_patterns.slice(0, 3).map((p, i) => (
                                      <span key={i} className="text-[10px] text-muted-foreground bg-muted px-1 rounded">{p}</span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 mr-2">
                                  <Switch checked={q.is_active} onCheckedChange={v => toggleActive(q.id, v)} />
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingQuery(q)}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteQuery(q.id)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Tab 2: Add New Query */}
          <TabsContent value="add">
            <QueryEditor onSave={handleSave} />
          </TabsContent>

          {/* Tab 3: Database Explorer */}
          <TabsContent value="explorer">
            <DatabaseExplorer />
          </TabsContent>

          {/* Tab 4: Pending Suggestions */}
          <TabsContent value="pending">
            <PendingQueriesManager onApproved={() => { loadData(); localAssistant.reload(); }} />
          </TabsContent>

          {/* Tab 5: Synonyms */}
          <TabsContent value="synonyms">
            <SynonymManager />
          </TabsContent>
        </Tabs>

        {/* Query Tester - Always visible at bottom */}
        <div className="mt-4 border-t pt-4">
          <h3 className="text-sm font-semibold mb-2">🧪 اختبار سريع</h3>
          <QueryTester />
        </div>
      </div>
    </div>
  );
}
