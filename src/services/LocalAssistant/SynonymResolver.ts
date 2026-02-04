// Synonym Resolver - Handles Arabic word variations

import { supabase } from '@/integrations/supabase/client';
import type { Synonym } from '@/types/assistant';

export class SynonymResolver {
  private synonyms: Synonym[] = [];
  private synonymMap: Map<string, string> = new Map();
  private loaded = false;

  // Load synonyms from database
  public async loadSynonyms(): Promise<void> {
    if (this.loaded) return;

    const { data, error } = await supabase
      .from('assistant_synonyms')
      .select('*');

    if (!error && data) {
      this.synonyms = data as Synonym[];
      this.buildSynonymMap();
      this.loaded = true;
    }
  }

  // Build reverse lookup map
  private buildSynonymMap(): void {
    this.synonymMap.clear();
    
    for (const entry of this.synonyms) {
      const normalizedWord = this.normalize(entry.word);
      
      // Map each synonym to the primary word
      for (const syn of entry.synonyms) {
        const normalizedSyn = this.normalize(syn);
        this.synonymMap.set(normalizedSyn, normalizedWord);
      }
    }
  }

  // Apply synonyms to input text
  public applySynonyms(text: string): string {
    let result = text;
    const words = text.split(/\s+/);
    
    for (const word of words) {
      const normalized = this.normalize(word);
      const primary = this.synonymMap.get(normalized);
      
      if (primary && primary !== normalized) {
        // Replace the word with its primary form
        result = result.replace(new RegExp(word, 'g'), primary);
      }
    }
    
    return result;
  }

  // Check if two words are synonyms
  public areSynonyms(word1: string, word2: string): boolean {
    const norm1 = this.normalize(word1);
    const norm2 = this.normalize(word2);
    
    if (norm1 === norm2) return true;
    
    const primary1 = this.synonymMap.get(norm1) || norm1;
    const primary2 = this.synonymMap.get(norm2) || norm2;
    
    return primary1 === primary2;
  }

  // Add a new synonym mapping
  public async addSynonym(word: string, synonym: string, category?: string): Promise<boolean> {
    const normalizedWord = this.normalize(word);
    
    // Check if word already exists
    const existing = this.synonyms.find(s => this.normalize(s.word) === normalizedWord);
    
    if (existing) {
      // Add to existing synonyms
      const updatedSynonyms = [...new Set([...existing.synonyms, synonym])];
      
      const { error } = await supabase
        .from('assistant_synonyms')
        .update({ synonyms: updatedSynonyms })
        .eq('id', existing.id);
      
      if (!error) {
        existing.synonyms = updatedSynonyms;
        this.buildSynonymMap();
        return true;
      }
    } else {
      // Create new entry
      const { error } = await supabase
        .from('assistant_synonyms')
        .insert({
          word,
          synonyms: [synonym],
          category,
        });
      
      if (!error) {
        this.loaded = false;
        await this.loadSynonyms();
        return true;
      }
    }
    
    return false;
  }

  // Get all synonyms for a word
  public getSynonyms(word: string): string[] {
    const normalized = this.normalize(word);
    const entry = this.synonyms.find(s => this.normalize(s.word) === normalized);
    return entry?.synonyms || [];
  }

  // Normalize Arabic text
  private normalize(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[أإآا]/g, 'ا')
      .replace(/[ىي]/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[^\w\s\u0600-\u06FF]/g, '');
  }

  // Reload synonyms from database
  public async reload(): Promise<void> {
    this.loaded = false;
    await this.loadSynonyms();
  }

  // Get all synonyms
  public getAllSynonyms(): Synonym[] {
    return this.synonyms;
  }
}

export const synonymResolver = new SynonymResolver();
