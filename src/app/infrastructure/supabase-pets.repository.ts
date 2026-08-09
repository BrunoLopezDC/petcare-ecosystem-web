import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Pet } from '../core/models/pet.model';
import { PetsRepository } from '../core/ports/pets.repository';
import { getSupabaseClient } from '../core/supabase/supabase.client';

/**
 * Concrete adapter for the PetsRepository port, backed by Supabase.
 * Tracks the existing Supabase table name "pets".
 */
@Injectable({ providedIn: 'root' })
export class SupabasePetsRepository implements PetsRepository {
  private readonly table = 'pets';

  list(): Observable<Pet[]> {
    return from(getSupabaseClient().from(this.table).select('*')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Pet[]) ?? [];
      })
    );
  }

  get(id: string): Observable<Pet | null> {
    return from(getSupabaseClient().from(this.table).select('*').eq('id', id).maybeSingle()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Pet) ?? null;
      })
    );
  }

  create(pet: Partial<Pet>): Observable<Pet> {
    return from(getSupabaseClient().from(this.table).insert(pet).select().single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Pet;
      })
    );
  }

  update(id: string, changes: Partial<Pet>): Observable<Pet> {
    return from(getSupabaseClient().from(this.table).update(changes).eq('id', id).select().single()).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Pet;
      })
    );
  }

  remove(id: string): Observable<void> {
    return from(getSupabaseClient().from(this.table).delete().eq('id', id)).pipe(
      map(({ error }) => {
        if (error) throw error;
      })
    );
  }
}