// Synonym Manager - Manage word mappings for the assistant

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Synonym } from '@/types/assistant';

export function SynonymManager() {
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [newSynonyms, setNewSynonyms] = useState('');
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => { loadSynonyms(); }, []);

  const loadSynonyms = async () => {
    setLoading(true);
    const { data } = await supabase.from('assistant_synonyms').select('*').order('word');
    setSynonyms((data || []) as Synonym[]);
    setLoading(false);
  };

  const addSynonym = async () => {
    if (!newWord || !newSynonyms) {
      toast.error('أدخل الكلمة والمرادفات');
      return;
    }
    const synonymsList = newSynonyms.split(',').map(s => s.trim()).filter(Boolean);
    const { error } = await supabase.from('assistant_synonyms').insert({
      word: newWord.trim(),
      synonyms: synonymsList,
      category: newCategory || null,
    });
    if (error) {
      toast.error('خطأ في الإضافة: ' + error.message);
    } else {
      toast.success('تمت الإضافة ✅');
      setNewWord('');
      setNewSynonyms('');
      setNewCategory('');
      loadSynonyms();
    }
  };

  const deleteSynonym = async (id: string) => {
    await supabase.from('assistant_synonyms').delete().eq('id', id);
    toast.success('تم الحذف');
    loadSynonyms();
  };

  if (loading) return <div className="text-center text-muted-foreground py-4">جاري التحميل...</div>;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Add New */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">إضافة مرادف جديد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="الكلمة الأساسية" />
          <Input value={newSynonyms} onChange={e => setNewSynonyms(e.target.value)} placeholder="المرادفات (مفصولة بفواصل)" />
          <Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="الفئة (اختياري)" />
          <Button onClick={addSynonym} size="sm"><Plus className="h-3 w-3 mr-1" /> إضافة</Button>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-2">
        {synonyms.length === 0 && <p className="text-center text-muted-foreground text-sm">لا توجد مرادفات</p>}
        {synonyms.map(syn => (
          <Card key={syn.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-sm">{syn.word}</span>
                {syn.category && <Badge variant="outline" className="mr-2 text-xs">{syn.category}</Badge>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {syn.synonyms.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteSynonym(syn.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
