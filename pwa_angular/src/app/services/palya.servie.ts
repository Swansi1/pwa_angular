import { Injectable } from '@angular/core';
import { from, Observable, ReplaySubject, Subject,BehaviorSubject } from 'rxjs';
import { switchMap, filter, map } from 'rxjs/operators';
import { Digimon } from '../models/digimon';
import { Palya } from '../models/palya';
import { Selected } from '../models/selected';
import {ClassColors} from './classColors';

@Injectable({
  providedIn: 'root',
})
export class PalyaService {
  public readonly digimonList$: Observable<Digimon[]>;
//   public readonly selectedList$: Observable<Selected[]>;
  public readonly selectedFieldId$ = new BehaviorSubject("");
  public readonly selectedFieldId2$ = new BehaviorSubject("");
  public readonly kiirandoText$ = new Subject<string>;
  // public readonly selectedDiginomImageUrl$: Observable<string>;
  public readonly currentMessage$: Observable<string>;
  
  public numberOfSelected = 0;
  public selectedItemID = "";
  public selectedItemID2 = "";

  private hideSelected(first: string, current: string) {
    // 1 sec múlva eltünteni a kijelölést ha nem sikerült megtalálni a megadott párt
    setTimeout(() => {
        let firstDoom = document.getElementById(first);
        let currentDoom = document.getElementById(current);
        
        if(firstDoom != null && currentDoom != null){
            let isExist = false; // keressük a bg-success-t mert ha az van rajta akkor már kirakták
            firstDoom.classList.forEach(cl => {
              if(cl == "bg-success"){
                isExist = true;
              }
            });
            if(!isExist){
              firstDoom.className = ClassColors.default;
            }

          isExist = false;
          currentDoom.classList.forEach(cl => {
              if(cl == "bg-success"){
                isExist = true;
              }
            });
            if(!isExist){
              currentDoom.className = ClassColors.default;
            }
        }

        // takarja vissza az elemeket
        this.selectedFieldId$.next("KOR_ZARAS");
      }, 1000);
  }
  constructor() {
    this.selectedFieldId2$.subscribe(data =>{
        this.selectedItemID2 = data;
        // this.selectedItemID = "";
    });

    this.numberOfSelected = 0;
    this.selectedFieldId$.subscribe(data => {
        console.log(data, this.numberOfSelected);
        if(this.numberOfSelected == 2){
            this.selectedFieldId2$.next(this.selectedItemID);

            let firstElement = document.getElementById(this.selectedItemID);
            let secElement = document.getElementById(data);
            let elementNumbers = [];
            if(firstElement != null && secElement != null){ // ha létezik ilyen doom akkor változtassuk meg a színét 
              this.hideSelected(this.selectedItemID,data); // többször biztosítás
              console.log("INNERHTML-ek")
              console.log(firstElement.getAttribute("data-hidenumber")) // ebben tárolódnak a számok amik lapulnak a lepel alatt :) 
              console.log(secElement.getAttribute("data-hidenumber"))
              elementNumbers.push(Number(firstElement.getAttribute("data-hidenumber")));
              elementNumbers.push(Number(secElement.getAttribute("data-hidenumber")));

              if(elementNumbers[0] == elementNumbers[1]){
                // egyezés van tehát megtalálták egymás párját
                this.kiirandoText$.next("Csak így tovább egy pár már megtalálva!");
                firstElement.className = ClassColors.match;
                secElement.className = ClassColors.match;
              }else{
                this.kiirandoText$.next("Sajnos nem sikerült párt taláni!");
                firstElement.className = ClassColors.notMatch;
                secElement.className = ClassColors.notMatch;
              }
            }
            // console.log(data);
            this.numberOfSelected = 0;

            //SELECTED ID_t nullátása
            this.selectedItemID = "";
            this.selectedItemID2 = "";

        }else{
          // this.selectedFieldId2$.next(this.selectedItemID);
          this.selectedItemID = data;
          this.selectedFieldId2$.next(""); // azért kell lenullázni mert kövi lépésnél látszódna még a szám
        }
        if(data != "KOR_ZARAS"){
          this.numberOfSelected++;
        }
    })
    
    this.currentMessage$ = this.kiirandoText$;
    // this.selectedDiginomImageUrl$ = this.selectedFieldId$;
    //   const observable: Observable<number> = Observable.from([1, 2, 3]);
    //   this.palya$ = Observable.from(person);
      
    //TODO api url
    // this.palya$ = from(
    // fetch('')
    // ).pipe(switchMap((res) => res.json()));

    // this.palya$ = from(fetch('')).pipe(switchMap((res) => res.json()));
    let data = {x:10,y:10};
    // this.palya$ = from(data).switchMap((res) => res.json());

    this.digimonList$ = from(
      fetch('https://digimon-api.vercel.app/api/digimon')
    ).pipe(
      switchMap((res) => res.json()),
      map((res: Digimon[]) => res.filter((digimon) => digimon.name.length >= 8))
    );
  }
}