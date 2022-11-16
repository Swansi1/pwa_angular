import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { switchMap, filter, map } from 'rxjs/operators';
import { Digimon } from '../models/digimon';

@Injectable({
  providedIn: 'root',
})
export class DigimonService {
  public readonly digimonList$: Observable<Digimon[]>;

  constructor() {
    //this.digimonList$ = from(
    //fetch('https://digimon-api.vercel.app/api/digimon')
    //).pipe(switchMap((res) => res.json()));

    this.digimonList$ = from(
      fetch('https://digimon-api.vercel.app/api/digimon')
    ).pipe(
      switchMap((res) => res.json()),
      map((res: Digimon[]) => res.filter((digimon) => digimon.name.length >= 8))
    );
  }
}