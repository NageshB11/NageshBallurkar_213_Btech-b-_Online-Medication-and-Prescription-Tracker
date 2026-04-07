import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterTaken',
  standalone: true
})
export class FilterTakenPipe implements PipeTransform {
  transform(meals: any[]): any[] {
    if (!meals) return [];
    return meals.filter(m => m.taken);
  }
}
