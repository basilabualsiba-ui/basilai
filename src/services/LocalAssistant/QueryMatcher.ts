// Query Matcher - Pattern matching engine for Arabic queries

import type { SavedQuery, MatchResult } from '@/types/assistant';
import { synonymResolver } from './SynonymResolver';

export class QueryMatcher {
  private queries: SavedQuery[] = [];

  // Set queries to match against
  public setQueries(queries: SavedQuery[]): void {
    this.queries = queries.filter(q => q.is_active);
  }

  // Match user input to a query
  public match(userInput: string): MatchResult | null {
    // Normalize input
    let normalized = this.normalize(userInput);
    
    // Apply synonyms
    normalized = synonymResolver.applySynonyms(normalized);
    
    let bestMatch: MatchResult | null = null;
    let bestScore = 0;
    
    for (const query of this.queries) {
      for (const pattern of query.trigger_patterns) {
        const { score, variables } = this.matchPattern(normalized, pattern);
        
        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestMatch = {
            query,
            confidence: score,
            extractedVariables: variables,
          };
        }
      }
    }
    
    return bestMatch;
  }

  // Match input against a pattern and extract variables
  private matchPattern(input: string, pattern: string): { score: number; variables: Record<string, string> } {
    const normalizedPattern = this.normalize(pattern);
    const variables: Record<string, string> = {};
    
    // Check for exact match
    if (input === normalizedPattern) {
      return { score: 1.0, variables };
    }
    
    // Check for variable patterns like {place}
    const variableRegex = /\{(\w+)\}/g;
    const hasVariables = variableRegex.test(pattern);
    
    if (hasVariables) {
      // Build regex to match pattern with variables
      let regexPattern = this.normalize(pattern)
        .replace(/\{(\w+)\}/g, '(.+?)');
      
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      const match = input.match(regex);
      
      if (match) {
        // Extract variable values
        const varNames = [...pattern.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
        varNames.forEach((name, index) => {
          variables[name] = match[index + 1]?.trim() || '';
        });
        
        return { score: 0.95, variables };
      }
      
      // Partial match with variables
      const patternWithoutVars = this.normalize(pattern).replace(/\{(\w+)\}/g, '').trim();
      if (input.includes(patternWithoutVars) || patternWithoutVars.includes(input)) {
        // Try to extract variable from the difference
        const diff = input.replace(patternWithoutVars, '').trim();
        const varNames = [...pattern.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
        if (varNames.length === 1 && diff) {
          variables[varNames[0]] = diff;
          return { score: 0.8, variables };
        }
      }
    }
    
    // Check for contains match
    if (input.includes(normalizedPattern)) {
      return { score: 0.9, variables };
    }
    
    if (normalizedPattern.includes(input)) {
      return { score: 0.7, variables };
    }
    
    // Calculate word overlap score
    const inputWords = new Set(input.split(/\s+/));
    const patternWords = normalizedPattern.replace(/\{(\w+)\}/g, '').split(/\s+/).filter(w => w);
    
    let matchedWords = 0;
    for (const word of patternWords) {
      if (inputWords.has(word)) {
        matchedWords++;
      } else {
        // Check for partial word match
        for (const inputWord of inputWords) {
          if (inputWord.includes(word) || word.includes(inputWord)) {
            matchedWords += 0.5;
            break;
          }
        }
      }
    }
    
    const score = patternWords.length > 0 ? matchedWords / patternWords.length : 0;
    return { score: score * 0.8, variables };
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
      .replace(/؟/g, '')
      .replace(/[^\w\s\u0600-\u06FF]/g, '')
      .replace(/\s+/g, ' ');
  }

  // Get suggested patterns for a new question
  public suggestPatterns(question: string): string[] {
    const normalized = this.normalize(question);
    const words = normalized.split(/\s+/);
    
    // Generate variations
    const patterns: string[] = [question];
    
    // Add variations with different word orders
    if (words.length >= 2) {
      patterns.push(words.slice(1).join(' ') + ' ' + words[0]);
    }
    
    return patterns;
  }

  // Find similar queries
  public findSimilar(input: string, threshold = 0.4): SavedQuery[] {
    const normalized = this.normalize(input);
    const similar: { query: SavedQuery; score: number }[] = [];
    
    for (const query of this.queries) {
      let maxScore = 0;
      for (const pattern of query.trigger_patterns) {
        const { score } = this.matchPattern(normalized, pattern);
        maxScore = Math.max(maxScore, score);
      }
      
      if (maxScore >= threshold) {
        similar.push({ query, score: maxScore });
      }
    }
    
    return similar
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.query);
  }
}

export const queryMatcher = new QueryMatcher();
