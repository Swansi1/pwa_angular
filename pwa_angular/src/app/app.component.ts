import { Component, OnInit } from '@angular/core';
import { BehaviorSubject,  from, Observable, Subject } from 'rxjs';
import { switchMap, startWith, map } from 'rxjs/operators';
import {SwUpdate} from '@angular/service-worker';
import { PalyaService } from './services/palya.servie';
import {ClassColors} from './services/classColors';
import { Score } from './models/score';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})

export class AppComponent implements OnInit {
  public readonly x: Array<number>;
  public readonly y: Array<number>;
  public numbers: Array<number>;

  public readonly selectedFieldId$ = new BehaviorSubject("");
  public readonly selectedFieldId2$ = new BehaviorSubject("");
  public readonly currentMessage$: Observable<string>;
  
  private readonly update$ = new Subject<void>(); // IDB
  private db$ :Observable<IDBDatabase>; // IDB

  public username$ = new Subject<string>;
  public teszt: Observable<Score[]>; // scoreList


  constructor(private readonly PalyaService : PalyaService,private update: SwUpdate) {

    let palyaSize = 6;
    this.numbers = new Array(palyaSize);
    for (let i = 0; i < palyaSize*palyaSize; i+=2) {
      this.numbers[i] = i;
      this.numbers[i+1] = i;
    }
    this.numbers = shuffle(this.numbers);
    this.x = new Array(palyaSize); 
    this.y = new Array(palyaSize);
    for (let i = 0; i < palyaSize; i++) {
      this.x[i] = i;
    }
    for (let i = 0; i < palyaSize; i++) {
      this.y[i] = i;
    }

    // Pálya service beállítása
    this.currentMessage$ = this.PalyaService.currentMessage$;
    this.selectedFieldId$ = this.PalyaService.selectedFieldId$;
    this.selectedFieldId2$ = this.PalyaService.selectedFieldId2$;
    this.username$ = this.PalyaService.username$;


    //DB init 
    this.db$ = new Observable<IDBDatabase>((observer) => {
      const openRequest = indexedDB.open("scoreDB");
      openRequest.onupgradeneeded = () => this.createDb(openRequest.result); // ha nincs létrehoz egyet
      openRequest.onsuccess = () => {
        observer.next(openRequest.result);
        observer.complete();
      };
    }); 

    // Frissíti az új scoreokat tudom igen ha sok adat van sokat kell töltenie de jó így mostra :) 
    // this.clearScores();
    this.teszt = from(
      fetch('https://swansi.hu/pwa_api/getscore.php?name=*')
      ).pipe(switchMap((res) => res.json()));
    this.teszt.subscribe(data => {
      console.log("SUBSCR");
      console.log(data);
      data.forEach(d => {
        this.addScore(d.id,d.name,d.click,d.date); // összes adat cache
      });
    })
    
  }

  public gamestart(uname: string) { // amikor beírja az usernamét a kezdő képernyőn
    this.username$.next(uname);
    this.updatingScores();

    this.teszt = this.teszt.pipe( // ha az username megegyezik 
    map((scores: Score[]) =>scores.filter((score) => score.name == uname))
    );
  }

  public cardClock(row : Number,col: Number,current: HTMLDivElement): void{ 
    // téglalapra kattintás utáni események
    if(current.classList.contains('bg-success') || current.classList.contains('bg-warning')){
      return; // ha már meg van találva vagy ki van jelölve
    }
    if(this.PalyaService.moveDisable){ // gyors kattintás miatt bebugol ha nem lenne benne
      console.log("lépés nem megengedett!");
      this.PalyaService.kiirandoText$.next("Várj egy kicsit!");
      return;
    }
    this.PalyaService.move(); // kattintás számláló
    // console.log(`flipCard${row}${col}`);
    let target = document.getElementById(`flipCard${row}${col}`);
    if(target != null){ // ez sose lesz null de ok :) 
      // console.log(target);
      target.className = ClassColors.selected; // kiválasztjuk a dom-ot 
    }
    this.selectedFieldId$.next(`flipCard${row}${col}`);
  }

  public ngOnInit(): void {
    this.checkUpdate()
    this.updatingScores();
  }

  public async addScore(id : string,name : string,click : string,date : string): Promise<void> {
    //score rögzítése
    this.db$
      .pipe(
        switchMap(
          (db) =>
            new Observable((observer) => {
              let transaction = db.transaction("scores", "readwrite");
              transaction.objectStore("scores").add({ id: Number(id), name: name, click: click, date: date, idbAdd: 0 });
              transaction.oncomplete = () => {
                transaction = null as any;
                this.update$.next();
                observer.complete();
              };
              return () => transaction?.abort();
            })
        )
      )
      .subscribe();
  }

  private updatingScores(): void {
    // teszt observable felötltése az új idb adatokkal
    this.teszt = this.update$.pipe(
      startWith(undefined),
      switchMap(() =>
        this.db$.pipe(
          switchMap(
            (db) =>
              new Observable<Score[]>((observer) => {
                let transaction = db.transaction("scores");
                const request = transaction.objectStore("scores").getAll();
                transaction.oncomplete = () => {
                  transaction = null as any;
                  observer.next(request.result as Score[]);
                  observer.complete();
                };
              })
          )
        )
      )
    );
    this.teszt.subscribe(data =>{
      let canDelete = false;
      data.forEach(d => {
        if(d.idbAdd == 1){
          canDelete = true;
          console.log("NEM UDPATELT ADAT", d);
          const observable = from(fetch(`https://swansi.hu/pwa_api/setscore.php?name=${d.name}&click=${d.click}&date=${d.date}`)).pipe(switchMap(response => response.json()));
        }
      });
      if(canDelete && window.navigator.onLine == true){ 
        this.clearScores();
        this.teszt = from(
          fetch('https://swansi.hu/pwa_api/getscore.php?name=*')
          ).pipe(switchMap((res) => res.json()));
          window.location.reload();
      }
    })
  }

  public clearScores(): void {
    this.db$
      .pipe(
        switchMap(
          (db) =>
            new Observable((observer) => {
              let transaction = db.transaction("scores", "readwrite");
              transaction.objectStore("scores").clear();

              transaction.oncomplete = () => {
                transaction = null as any;
                this.update$.next();
                observer.complete();
              };
              return () => transaction?.abort();
            })
        )
      )
      .subscribe();
  }

  private createDb(db: IDBDatabase): void {
    // db létrehozása
    db.createObjectStore("scores",{keyPath: "id",autoIncrement: true});
  }

  private checkUpdate(){
    // pwa új verzió elérhető
    this.update.checkForUpdate().then(data =>{
      if(data){
        alert("Új verzió elérhető");
        window.location.reload(); // Ha letöltjük az appot ezzel nem frissíti le az oldalt csak f5el
      }
    })
  }

}


export function shuffle<T>(array: T[]): T[] { // array shuffle
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
