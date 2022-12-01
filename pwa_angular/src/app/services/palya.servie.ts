import { Injectable } from '@angular/core';
import {  Observable, Subject, BehaviorSubject, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Score } from '../models/score';
import { ClassColors } from './classColors';

@Injectable({
  providedIn: 'root',
})
export class PalyaService {
  //   public readonly selectedList$: Observable<Selected[]>;
  public readonly selectedFieldId$ = new BehaviorSubject("");
  public readonly selectedFieldId2$ = new BehaviorSubject("");
  public readonly kiirandoText$ = new Subject<string>;
  // public readonly selectedDiginomImageUrl$: Observable<string>;
  public readonly currentMessage$: Observable<string>;
  public readonly username$ = new Subject<string>;
  public readonly scoreList$: Observable<Score[]>;

  public numberOfSelected = 0;
  public selectedItemID = "";
  public selectedItemID2 = "";
  public username = "NINCS_MEGADVA";
  public moveDisable = false; // Ha gyorsan kattintasz bebugol ezért ameddig el nem tűnik a rossz pár megjelölése addig le kell tiltani a moveokat
  private moveCount = 0;
  private findElement = 0;


  private readonly update$ = new Subject<void>(); // IDB
  private db$ :Observable<IDBDatabase>; // IDB

  private hideSelected(first: string, current: string) {
    // 1 sec múlva eltünteni a kijelölést ha nem sikerült megtalálni a megadott párt
    this.moveDisable = true; // bug miatt letiltani 
    setTimeout(() => {
      let firstDoom = document.getElementById(first);
      let currentDoom = document.getElementById(current);

      if (firstDoom != null && currentDoom != null) {
        let isExist = false; // keressük a bg-success-t mert ha az van rajta akkor már kirakták
        firstDoom.classList.forEach(cl => {
          if (cl == "bg-success") {
            isExist = true;
          }
        });
        if (!isExist) {
          firstDoom.className = ClassColors.default;
        }

        isExist = false;
        currentDoom.classList.forEach(cl => {
          if (cl == "bg-success") {
            isExist = true;
          }
        });
        if (!isExist) {
          currentDoom.className = ClassColors.default;
        }
      }

      // takarja vissza az elemeket
      this.moveDisable = false;
      this.selectedFieldId$.next("KOR_ZARAS");
    }, 1000);
  }
  constructor() {
    //DB init 
    this.db$ = new Observable<IDBDatabase>((observer) => {
      const openRequest = indexedDB.open("scoreDB");
      openRequest.onupgradeneeded = () => this.createDb(openRequest.result); // ha nincs létrehoz egyet
      openRequest.onsuccess = () => {
        observer.next(openRequest.result);
        observer.complete();
      };
    }); 

    this.username$.next("NINCS_MEGADVA");
    this.username$.subscribe(data => {
      this.username = data;
    })
    this.moveDisable = false;
    this.scoreList$ = of();

    this.selectedFieldId2$.subscribe(data => {
      this.selectedItemID2 = data;
      // this.selectedItemID = "";
    });

    this.numberOfSelected = 0; // hány téglalap van kiválasztva
    this.selectedFieldId$.subscribe(data => {
      if (this.numberOfSelected == 2) { // kettő van kiválasztva
        this.selectedFieldId2$.next(this.selectedItemID);

        let firstElement = document.getElementById(this.selectedItemID);
        let secElement = document.getElementById(data);
        let elementNumbers = [];
        if (firstElement != null && secElement != null) { // ha létezik ilyen doom akkor változtassuk meg a színét 
          this.hideSelected(this.selectedItemID, data); // többször biztosítás
          //console.log(firstElement.getAttribute("data-hidenumber")) // *ebben tárolódnak a számok amik lapulnak a lepel alatt :) 
          //* itt alapból más volt az elképzelés de végül nem lett magvalósítva de így maradt mert műküdik
          elementNumbers.push(Number(firstElement.getAttribute("data-hidenumber")));
          elementNumbers.push(Number(secElement.getAttribute("data-hidenumber")));

          if (elementNumbers[0] == elementNumbers[1]) { 
            // egyezés van tehát megtalálták egymás párját
            this.kiirandoText$.next("Csak így tovább egy pár már megtalálva!");
            firstElement.className = ClassColors.match; // beállítjuk zöldre
            secElement.className = ClassColors.match;
            this.findElement++; // találtak párt
            this.gameFinished(); // nézzük meg hogy vége van-e már
          } else {
            this.kiirandoText$.next("Sajnos nem sikerült párt taláni!");
            firstElement.className = ClassColors.notMatch;
            secElement.className = ClassColors.notMatch;
          }
        }
        this.numberOfSelected = 0;

        //SELECTED ID_t nullátása
        this.selectedItemID = "";
        this.selectedItemID2 = "";

      } else {
        // this.selectedFieldId2$.next(this.selectedItemID);
        this.selectedItemID = data;
        this.selectedFieldId2$.next(""); // azért kell lenullázni mert kövi lépésnél látszódna még a szám
      }
      if (data != "KOR_ZARAS") {
        this.numberOfSelected++;
      }
    })

    this.currentMessage$ = this.kiirandoText$;

  }

  private createDb(db: IDBDatabase): void {
    // db létrehozása
    db.createObjectStore("scores",{keyPath: "id", autoIncrement: true});
  }



  public move() {
    this.moveCount++;
    console.log("Jelenlegi lépés: ", this.moveCount);
    // this.addScore(this.username,String(this.moveCount), new Date().toISOString().slice(0, 19).replace('T', ' ')); //! just test 

  }

  public gameFinished(){
    console.log("ok");
    if(this.findElement == 18){ // azért 18 mert 36 mező van(6*6-os a pálya) és 36nak 18 a fele
        this.addScore(this.username,String(this.moveCount), new Date().toISOString().slice(0, 19).replace('T', ' '));
        // const observable = from(fetch(`https://swansi.hu/pwa_api/setscore.php?name=${this.username}&click=${this.moveCount}`)).pipe(switchMap(response => response.json()));
        alert("sikeresen befejezted a játékot! Kattintásaid száma:" + this.moveCount);
        // window.location.reload();

    }
  }

  public async addScore(name : string,click : string,date : string): Promise<void> {
    //score rögzítése
    this.db$
      .pipe(
        switchMap(
          (db) =>
            new Observable((observer) => {
              let transaction = db.transaction("scores", "readwrite");
              transaction.objectStore("scores").add({ name: name, click: click, date: date, idbAdd: 1  });
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
}

