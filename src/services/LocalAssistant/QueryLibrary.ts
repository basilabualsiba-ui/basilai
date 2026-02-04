// Query Library - CRUD operations for saved queries

import { supabase } from '@/integrations/supabase/client';
import type { SavedQuery, PendingQuery, QueryConfig } from '@/types/assistant';

export class QueryLibrary {
  private queries: SavedQuery[] = [];
  private loaded = false;

  // Load all queries from database
  public async loadQueries(): Promise<SavedQuery[]> {
    const { data, error } = await supabase
      .from('assistant_queries')
      .select('*')
      .eq('is_active', true)
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error loading queries:', error);
      return [];
    }

    this.queries = (data || []).map(q => ({
      ...q,
      query_config: q.query_config as unknown as QueryConfig,
    })) as SavedQuery[];
    
    this.loaded = true;
    return this.queries;
  }

  // Get all queries
  public getQueries(): SavedQuery[] {
    return this.queries;
  }

  // Get queries by category
  public getQueriesByCategory(category: string): SavedQuery[] {
    return this.queries.filter(q => q.category === category);
  }

  // Add a new query
  public async addQuery(query: Omit<SavedQuery, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): Promise<SavedQuery | null> {
    const { data, error } = await supabase
      .from('assistant_queries')
      .insert({
        query_name: query.query_name,
        category: query.category,
        purpose: query.purpose,
        trigger_patterns: query.trigger_patterns,
        query_config: query.query_config as any,
        output_template: query.output_template,
        is_active: query.is_active,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding query:', error);
      return null;
    }

    const newQuery = {
      ...data,
      query_config: data.query_config as unknown as QueryConfig,
    } as SavedQuery;
    
    this.queries.push(newQuery);
    return newQuery;
  }

  // Update a query
  public async updateQuery(id: string, updates: Partial<SavedQuery>): Promise<boolean> {
    const { error } = await supabase
      .from('assistant_queries')
      .update({
        ...updates,
        query_config: updates.query_config as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating query:', error);
      return false;
    }

    // Update local cache
    const index = this.queries.findIndex(q => q.id === id);
    if (index !== -1) {
      this.queries[index] = { ...this.queries[index], ...updates };
    }

    return true;
  }

  // Delete a query (soft delete)
  public async deleteQuery(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('assistant_queries')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting query:', error);
      return false;
    }

    this.queries = this.queries.filter(q => q.id !== id);
    return true;
  }

  // Add trigger pattern to existing query
  public async addTriggerPattern(queryId: string, pattern: string): Promise<boolean> {
    const query = this.queries.find(q => q.id === queryId);
    if (!query) return false;

    const updatedPatterns = [...new Set([...query.trigger_patterns, pattern])];
    return this.updateQuery(queryId, { trigger_patterns: updatedPatterns });
  }

  // Get pending query suggestions
  public async getPendingQueries(): Promise<PendingQuery[]> {
    const { data, error } = await supabase
      .from('assistant_pending_queries')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading pending queries:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      suggested_query: item.suggested_query as any,
      suggestion_reason: item.suggestion_reason,
      status: item.status as 'pending' | 'approved' | 'rejected',
      created_at: item.created_at,
    }));
  }

  // Approve a pending query
  public async approvePendingQuery(id: string): Promise<SavedQuery | null> {
    // Get the pending query
    const { data: pending, error: fetchError } = await supabase
      .from('assistant_pending_queries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !pending) {
      console.error('Error fetching pending query:', fetchError);
      return null;
    }

    const suggestedQuery = pending.suggested_query as any;

    // Create the actual query
    const newQuery = await this.addQuery({
      query_name: suggestedQuery.query_name,
      category: suggestedQuery.category || 'general',
      purpose: suggestedQuery.purpose,
      trigger_patterns: suggestedQuery.trigger_patterns,
      query_config: suggestedQuery.query_config,
      output_template: suggestedQuery.output_template,
      is_active: true,
    });

    if (newQuery) {
      // Mark as approved
      await supabase
        .from('assistant_pending_queries')
        .update({ status: 'approved' })
        .eq('id', id);
    }

    return newQuery;
  }

  // Reject a pending query
  public async rejectPendingQuery(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('assistant_pending_queries')
      .update({ status: 'rejected' })
      .eq('id', id);

    return !error;
  }

  // Suggest a new query (for AI to populate)
  public async suggestQuery(
    suggestion: {
      query_name: string;
      purpose: string;
      trigger_patterns: string[];
      query_config: QueryConfig;
      output_template?: string;
    },
    reason: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('assistant_pending_queries')
      .insert({
        suggested_query: suggestion as any,
        suggestion_reason: reason,
        status: 'pending',
      });

    return !error;
  }

  // Check if loaded
  public isLoaded(): boolean {
    return this.loaded;
  }

  // Reload queries
  public async reload(): Promise<SavedQuery[]> {
    this.loaded = false;
    return this.loadQueries();
  }

  // Find query by name
  public findByName(name: string): SavedQuery | undefined {
    return this.queries.find(q => q.query_name === name);
  }

  // Get categories with counts
  public getCategoriesWithCounts(): { category: string; count: number }[] {
    const counts = new Map<string, number>();
    
    for (const query of this.queries) {
      counts.set(query.category, (counts.get(query.category) || 0) + 1);
    }
    
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }
}

export const queryLibrary = new QueryLibrary();
