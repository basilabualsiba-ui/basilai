// Response Formatter - Formats query results into natural language

import type { QueryResult, SavedQuery } from '@/types/assistant';

export class ResponseFormatter {
  // Format results using template
  public format(
    query: SavedQuery,
    result: QueryResult,
    variables: Record<string, any>
  ): string {
    if (result.error) {
      return `❌ حصل خطأ: ${result.error}`;
    }

    // Use template if available
    if (query.output_template) {
      return this.applyTemplate(query.output_template, result, variables);
    }

    // Generate response based on query category
    return this.generateResponse(query, result, variables);
  }

  // Apply template with placeholders
  private applyTemplate(
    template: string,
    result: QueryResult,
    variables: Record<string, any>
  ): string {
    let output = template;

    // Replace aggregation placeholders
    if (result.aggregations) {
      for (const [key, value] of Object.entries(result.aggregations)) {
        output = output.replace(`{${key}}`, this.formatNumber(value, 'currency'));
      }
    }

    // Replace total
    if (result.total !== undefined) {
      output = output.replace('{total}', this.formatNumber(result.total, 'currency'));
    }

    // Replace count
    if (result.data) {
      output = output.replace('{count}', String(result.data.length));
    }

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      output = output.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    // Replace data fields
    if (result.data.length > 0) {
      const firstRow = result.data[0];
      for (const [key, value] of Object.entries(firstRow)) {
        if (typeof value === 'number') {
          output = output.replace(`{${key}}`, this.formatNumber(value, 'currency'));
        } else if (value !== null && value !== undefined) {
          output = output.replace(`{${key}}`, String(value));
        }
      }
    }

    return output;
  }

  // Generate response when no template exists
  private generateResponse(
    query: SavedQuery,
    result: QueryResult,
    variables: Record<string, any>
  ): string {
    const { data, aggregations } = result;

    if (data.length === 0 && !aggregations?.total && !aggregations?.count) {
      return this.getEmptyResponse(query.category);
    }

    switch (query.category) {
      case 'financial':
        return this.formatFinancialResponse(query, result, variables);
      case 'gym':
        return this.formatGymResponse(query, result, variables);
      case 'prayer':
        return this.formatPrayerResponse(query, result);
      case 'supplements':
        return this.formatSupplementsResponse(query, result);
      case 'dreams':
        return this.formatDreamsResponse(query, result);
      case 'schedule':
        return this.formatScheduleResponse(query, result);
      default:
        return this.formatGenericResponse(result);
    }
  }

  // Financial responses
  private formatFinancialResponse(
    query: SavedQuery,
    result: QueryResult,
    variables: Record<string, any>
  ): string {
    const { data, aggregations } = result;
    let response = '';

    if (aggregations?.total !== undefined) {
      response = `💰 المجموع: ${this.formatNumber(aggregations.total, 'currency')} شيكل`;
    }

    if (query.query_name.includes('balance')) {
      response = '💵 **الحسابات:**\n';
      for (const account of data) {
        response += `• ${account.name}: ${this.formatNumber(account.amount, 'currency')} ${account.currency}\n`;
      }
      if (aggregations?.total) {
        response += `\n**الإجمالي:** ${this.formatNumber(aggregations.total, 'currency')} شيكل`;
      }
    }

    if (data.length > 0 && query.query_name.includes('spending')) {
      response += '\n\n📋 **التفاصيل:**\n';
      const shown = data.slice(0, 5);
      for (const tx of shown) {
        const category = tx.categories?.name || tx.category_name || '';
        const subcategory = tx.subcategories?.name || tx.subcategory_name || '';
        response += `• ${category}${subcategory ? ` - ${subcategory}` : ''}: ${this.formatNumber(tx.amount, 'currency')} شيكل\n`;
      }
      if (data.length > 5) {
        response += `... و${data.length - 5} معاملات أخرى`;
      }
    }

    return response || this.formatGenericResponse(result);
  }

  // Gym responses
  private formatGymResponse(
    query: SavedQuery,
    result: QueryResult,
    variables: Record<string, any>
  ): string {
    const { data, aggregations } = result;

    if (query.query_name.includes('workout') && query.query_name.includes('today')) {
      if (data.length === 0) {
        return '💪 لا يوجد تمرين مجدول لليوم - يوم راحة! 🧘';
      }
      const workout = data[0];
      const muscles = Array.isArray(workout.muscle_groups) 
        ? workout.muscle_groups.join(' + ') 
        : workout.muscle_groups;
      return `💪 **تمرين اليوم:**\n${muscles}\n${workout.start_time ? `⏰ الساعة ${workout.start_time}` : ''}`;
    }

    if (query.query_name.includes('weight')) {
      if (data.length === 0) {
        return '⚖️ لا توجد قياسات وزن محفوظة';
      }
      const latest = data[0];
      let response = `⚖️ **الوزن الحالي:** ${latest.weight} كغ\n`;
      
      if (data.length > 1) {
        const change = latest.weight - data[data.length - 1].weight;
        const emoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        response += `${emoji} التغير: ${change > 0 ? '+' : ''}${change.toFixed(1)} كغ`;
      }
      return response;
    }

    if (aggregations?.count !== undefined) {
      return `🏋️ عدد التمارين: ${aggregations.count}`;
    }

    return this.formatGenericResponse(result);
  }

  // Prayer responses
  private formatPrayerResponse(query: SavedQuery, result: QueryResult): string {
    const { data } = result;

    if (data.length === 0) {
      return '🕌 لا توجد مواقيت صلاة محفوظة لليوم';
    }

    const times = data[0];
    return `🕌 **مواقيت الصلاة:**\n` +
      `• الفجر: ${times.fajr}\n` +
      `• الظهر: ${times.dhuhr}\n` +
      `• العصر: ${times.asr}\n` +
      `• المغرب: ${times.maghrib}\n` +
      `• العشاء: ${times.isha}`;
  }

  // Supplements responses
  private formatSupplementsResponse(query: SavedQuery, result: QueryResult): string {
    const { data } = result;

    if (data.length === 0) {
      return '💊 لا توجد مكملات محفوظة';
    }

    let response = '💊 **المكملات:**\n';
    for (const sup of data) {
      const percentage = Math.round((sup.remaining_doses / sup.total_doses) * 100);
      const emoji = percentage <= 20 ? '⚠️' : percentage <= 50 ? '🟡' : '🟢';
      response += `${emoji} ${sup.name}: ${sup.remaining_doses}/${sup.total_doses}\n`;
    }
    return response;
  }

  // Dreams responses
  private formatDreamsResponse(query: SavedQuery, result: QueryResult): string {
    const { data } = result;

    if (data.length === 0) {
      return '🌟 لا توجد أهداف نشطة';
    }

    let response = '🌟 **أهدافك:**\n';
    for (const dream of data) {
      const progress = dream.progress_percentage || 0;
      const bar = this.progressBar(progress);
      response += `• ${dream.title}\n  ${bar} ${progress}%\n`;
    }
    return response;
  }

  // Schedule responses
  private formatScheduleResponse(query: SavedQuery, result: QueryResult): string {
    const { data } = result;

    if (data.length === 0) {
      return '📅 لا توجد أنشطة مجدولة لليوم';
    }

    let response = '📅 **جدول اليوم:**\n';
    for (const activity of data) {
      const status = activity.is_completed ? '✅' : '⏳';
      const time = activity.start_time ? `${activity.start_time} - ` : '';
      response += `${status} ${time}${activity.title}\n`;
    }
    return response;
  }

  // Generic response
  private formatGenericResponse(result: QueryResult): string {
    const { data, aggregations } = result;

    if (aggregations?.total !== undefined) {
      return `📊 النتيجة: ${this.formatNumber(aggregations.total, 'currency')}`;
    }

    if (aggregations?.count !== undefined) {
      return `📊 العدد: ${aggregations.count}`;
    }

    if (data.length > 0) {
      return `📊 تم العثور على ${data.length} نتيجة`;
    }

    return '📊 لا توجد نتائج';
  }

  // Empty response by category
  private getEmptyResponse(category: string): string {
    const responses: Record<string, string> = {
      financial: '💰 لا توجد معاملات',
      gym: '💪 لا توجد بيانات تمارين',
      prayer: '🕌 لا توجد بيانات صلاة',
      supplements: '💊 لا توجد مكملات',
      dreams: '🌟 لا توجد أهداف',
      schedule: '📅 لا توجد أنشطة',
    };
    return responses[category] || '📊 لا توجد نتائج';
  }

  // Format number
  private formatNumber(num: number, type: 'currency' | 'count' | 'percentage'): string {
    if (type === 'currency') {
      return num.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    if (type === 'percentage') {
      return `${num}%`;
    }
    return num.toString();
  }

  // Create progress bar
  private progressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  // Format date in Arabic
  public formatDate(date: Date, format: 'full' | 'relative' = 'full'): string {
    if (format === 'relative') {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) return 'اليوم';
      if (days === 1) return 'أمس';
      if (days < 7) return `قبل ${days} أيام`;
      if (days < 30) return `قبل ${Math.floor(days / 7)} أسابيع`;
      return `قبل ${Math.floor(days / 30)} شهور`;
    }

    return date.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

export const responseFormatter = new ResponseFormatter();
