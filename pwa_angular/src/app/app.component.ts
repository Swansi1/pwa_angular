import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject, Subject } from 'rxjs';
import { switchMap, map, first, last, takeLast } from 'rxjs/operators';
import { DigimonService } from './services/digimon.service';
import { Digimon } from './models/digimon';
import { PalyaService } from './services/palya.servie';
import {ClassColors} from './services/classColors';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  public readonly digimon$: Observable<Digimon[]>;
  public readonly x: Array<number>;
  public readonly y: Array<number>;
  public numbers: Array<number>;
  public readonly selectedFieldId$ = new BehaviorSubject("");
  public readonly selectedFieldId2$ = new BehaviorSubject("");
  public readonly currentMessage$: Observable<string>;

  // public readonly y: [];


  isOnline: boolean;

  constructor(private readonly DigimonService: DigimonService,private readonly PalyaService : PalyaService) {
    // this.x = Array(5).fill(5,1,1); 
    this.numbers = new Array(5);
    for (let i = 0; i < 5*5; i+=2) {
      this.numbers[i] = i;
      this.numbers[i+1] = i;
    }
    this.numbers = shuffle(this.numbers);
    this.x = new Array(5); //todo real array size
    this.y = new Array(5);
    for (let i = 0; i < 5; i++) {
      this.x[i] = i;
    }
    for (let i = 0; i < 5; i++) {
      this.y[i] = i;
    }

    this.currentMessage$ = this.PalyaService.currentMessage$;
    this.selectedFieldId$ = this.PalyaService.selectedFieldId$;
    this.selectedFieldId2$ = this.PalyaService.selectedFieldId2$;

    this.isOnline = false;
    this.digimon$ = this.DigimonService.digimonList$;
  }

  public ngOnInit(): void {
    this.updateOnlineStatus();

    window.addEventListener('online',  this.updateOnlineStatus.bind(this));
    window.addEventListener('offline', this.updateOnlineStatus.bind(this));
  }

  public cardClock(row : Number,col: Number,current: HTMLDivElement): void{
    if(current.classList.contains('bg-success')){
      return;
    }
    // console.log(`flipCard${row}${col}`);
    let target = document.getElementById(`flipCard${row}${col}`);
    if(target != null){ // ez sose lesz null de ok :) 
      // console.log(target);
      target.className = ClassColors.selected;
    }
    // console.log("=======");
    console.log("App Component TS");
    console.log(this.selectedFieldId$.getValue())
    console.log(this.selectedFieldId2$.getValue())
    console.log("============")
    this.selectedFieldId$.next(`flipCard${row}${col}`);
  }

  private updateOnlineStatus(): void {
    this.isOnline = window.navigator.onLine;
    console.info(`isOnline=[${this.isOnline}]`);
  }



}


export function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
};


//TODO 
// BUGOK: túl gyorsan kattintasz be fog buggolni sárga lesz az eégsz