# TomWa Warhammer HUD (`warhammer-battle-hud`)

[English](README.md) | **Polski**

Wszystko, czego postać potrzebuje w walce, na jednym ekranie i bez dodatkowych modułów: ramki drużyny, panel akcji i pasek amunicji. Moduł wykrywa aktywny system Warhammera.

Wymaga **Foundry VTT v14** i jednego z systemów: **WFRP 4e / 5e** (`wfrp4e` 10.0+), **The Old World** (`whtow`), **Imperium Maledictum** (`impmal`), **Wrath & Glory** (`wrath-and-glory`), **Soulbound** (`age-of-sigmar-soulbound`).

Nie włączaj go razem z innymi modułami, które dodają ramki drużyny, śledzą amunicję albo dodają HUD akcji: robiłyby to samo podwójnie i przeszkadzały sobie nawzajem.

## 🖼️ Zrzuty ekranu

| | |
|---|---|
| ![WFRP: licznik Przewagi i to, na co można ją wydać](docs/screenshots/wfrp-advantage.png)<br>WFRP: licznik Przewagi i to, na co można ją wydać | ![WFRP: podpowiedź broni](docs/screenshots/wfrp-tooltip.png)<br>WFRP: podpowiedź broni |
| ![The Old World: umiejętności według cech](docs/screenshots/old-world-skills.png)<br>The Old World: umiejętności według cech | ![The Old World: podpowiedź zaklęcia](docs/screenshots/old-world-spell.png)<br>The Old World: podpowiedź zaklęcia |
| ![Imperium Maledictum: umiejętności ze specjalizacjami, Przewaga drużyny](docs/screenshots/imperium-maledictum-skills.png)<br>Imperium Maledictum: umiejętności ze specjalizacjami, Przewaga drużyny | ![Wrath & Glory: walka, podpowiedź broni i Chwała](docs/screenshots/wrath-and-glory-combat.png)<br>Wrath & Glory: walka, podpowiedź broni i Chwała |
| ![Soulbound: atrybuty i umiejętności z pulą kości, Ogień Duszy](docs/screenshots/soulbound-skills.png)<br>Soulbound: atrybuty i umiejętności z pulą kości, Ogień Duszy | |

## 📥 Instalacja

Wklej w *Manifest URL* w **Dodatki → Zainstaluj moduł**:

```
https://github.com/TomWa-Foundry-VTT-Workshop/warhammer-battle-hud/releases/latest/download/module.json
```

## 🧭 Pływający HUD

HUD (Przewaga, panel akcji i amunicja) unosi się nad sceną. Przytrzymaj przycisk myszy w dowolnym miejscu HUD-a i przeciągnij (zwykłe kliknięcie dalej uruchamia przyciski); położenie zapisuje się przy koncie gracza, więc działa na każdym komputerze. **Podwójny klik** na uchwycie przywraca go nad pasek makr. Panel akcji rozwija się w górę, a w dół, gdy przesuniesz HUD w górną część ekranu; ustawienie „Kierunek rozwijania panelu akcji” pozwala wybrać jeden kierunek na stałe.

## ✋ Ręce i wyposażenie

Obok dużego licznika **Ręce** pokazują, co trzyma każda ręka i ile jest zajętych (2/2). Broń dwuręczna wypełnia obie ręce; druga ręka ma znacznik **2.**, a jej podpowiedź mówi o karze, którą nalicza system. **Klik** na ręce pozwala wybrać do niej broń: to, co w niej było, zostaje odłożone, broń dwuręczna zwalnia obie ręce, a broń już trzymana przechodzi do wybranej ręki. **Prawy klik** opróżnia rękę.

W WFRP liczba rąk to punkty wyposażenia postaci (2, a więcej np. u istot z dodatkowymi ramionami) i dalej działa systemowy limit założonej broni. W Imperium Maledictum to lewa i prawa ręka, z wiodącą jako główną. W każdym systemie ręka wiodąca jest pierwsza (po lewej), a druga ręka za nią; ręka, której nie da się używać (uraz), jest przekreślona. Ręce pokazują, co trzyma każda ręka; każdą broń i pancerz można też założyć w grupie Ekwipunek zakładki Walka.

Systemy bez zasad rąk (The Old World, Wrath & Glory, Soulbound oraz BN-i Imperium Maledictum, którym system nie daje rąk) pokazują ten sam widżet jako **Wyposażenie**: pole na każdą założoną broń i pancerz oraz pole **+**. **Klik** na przedmiocie pozwala zamienić go na inny albo odłożyć, **prawy klik** odkłada, a **+** pokazuje, co jeszcze można założyć. Broń dwuręczna ma znacznik „2” (chwyt 2H w The Old World, cecha Dwuręczna w Soulbound). Pod każdą bronią (w obu widżetach) jest wąski **pasek ataku**, który uruchamia ten sam test co przycisk broni w panelu akcji. Pokazuje samą ikonę, więc mieści się pod polem jednej ręki w każdej czcionce i języku: miecz dla broni wręcz, celownik dla dystansowej i tarczę pod tarczą w The Old World (podpowiedź podaje nazwę akcji i broni). Alt pomija okno rzutu, Shift daje tajny rzut, prawy klik otwiera broń; broń, którą trzeba przeładować, ma przygaszony pasek. Widżet można ukryć w ustawieniach („Pokaż ręce / wyposażenie”).

## 🎨 Kolory systemów

Każdy gracz wybiera wygląd w ustawieniach („Kolorystyka HUD-a”): **Jak karta postaci**, **Ciemna (klasyczna)** albo **Domyślna systemu** – ciemna w WFRP (4e i 5e), jak karta w pozostałych systemach. Zmiana działa od razu.

W wariancie jak karta postaci HUD bierze z karty tło, przyciski, aktywną zakładkę, nagłówki list i czcionki. WFRP: pergamin, ciemnoczerwona aktywna zakładka i granatowe zakładki. The Old World: pergamin z granatowymi przyciskami i brązowymi nagłówkami list. Imperium Maledictum: ciemny turkus z pomarańczem. Wrath & Glory: jasny papier z czarnymi przyciskami i imperialną czerwienią. Soulbound: jasny papier z granatowymi paskami nagłówków Azyru i złotem Sigmara. Wariant ciemny to klasyczny półprzezroczysty HUD w kolorach systemu (w WFRP ciemny brąz i czerwień). Każdy system ustawia ten sam zestaw zmiennych kolorów, więc układ i działanie są wszędzie takie same. Ramki drużyny mają te same kolory, a ich wygląd można w ustawieniach przełączyć na Pergamin albo Imperium.

## ⚡ Przewaga (WFRP)

Duży licznik z przodu HUD-a zależy od systemu: Przewaga drużyny w Imperium Maledictum, Chwała w Wrath & Glory i Ogień Duszy w Soulbound. W WFRP duży licznik pokazuje Przewagę postaci i świeci mocniej, im jest jej więcej, aż do maksimum. Ręcznie zmienia licznik tylko MG: **klik** +1, **prawy klik** −1. Gracze widzą wartość i zasady w podpowiedzi. Ramki drużyny też ją wyróżniają. Można go ukryć w ustawieniach.

W zasadach 4. edycji pierwsza zakładka, **Przewaga**, pokazuje, na co postać może teraz wydać Przewagę, z kosztem (⚡1, ⚡2): użycia Przewagi z systemu (z Up in Arms: Grzmotnięcie, Sztuczka, Dodatkowy wysiłek, Ucieczka przed zagrożeniem, Dodatkowa Akcja), a z modułem **Underworld** (`wfrp4e-underworld`) także rozkazy taktyczne, które może wykonać Świta Herszta. Akcje, na które jeszcze brakuje Przewagi, są przygaszone. Klik na użyciu Przewagi odejmuje koszt, wysyła opis na czat i rzuca test, tak jak przycisk na karcie postaci; klik na rozkazie szajki otwiera okno rozkazu z Underworld.

**Własne akcje za Przewagę.** MG dodaje je w ustawieniach modułu przyciskiem **Dostosuj** (okno „Dostosuj HUD”), podając nazwę, koszt od 0 do 10, opis i opcjonalnie jedno z makr świata. Pojawiają się w zakładce Przewaga po akcjach systemu, u każdej postaci z Przewagą. Kliknięcie odejmuje koszt od Przewagi, wpisuje akcję na czat i uruchamia makro u gracza, który kliknął, więc gracze muszą mieć do tego makra uprawnienie co najmniej „Ograniczone”. Do wyboru są tylko makra, których nie może edytować żaden gracz. Gdy makra brakuje, gracz nie może go uruchomić albo może je edytować gracz, nic nie zostaje wydane. Makro skryptowe dostaje `actor`, `token`, `speaker` i `advantageAction` (`id`, `name`, `cost`). Przykład: wypicie mikstury jako akcja dodatkowa za 1 Przewagę.

## ⚔️ Panel akcji

Zakładki nad paskiem makr dla zaznaczonego tokena albo przypisanej postaci. Każdy system ma ten sam układ: **Walka** zaczyna się od akcji systemu (w WFRP 4e mają własną zakładkę Przewaga) i kończy grupą **Ekwipunek** (klik zakłada albo odkłada każdą broń, pancerz i tarczę, prawy klik otwiera przedmiot); postacie graczy widzą w niej tylko założoną broń i pancerz, BN-i i stworzenia wszystko (ustawienie „Panel akcji: tylko założony sprzęt”); umiejętności są w kolumnach według cech z wartością cechy w nagłówku; stany, rany i podobne są w zakładce **Stan**. W WFRP: Przewaga (tylko 4. edycja – użycia Przewagi, rozkazy szajki i licznik), walka, cechy, umiejętności, magia, religia, talenty, stan i zakładka Poza walką (Dochód z bieżącej kariery, Sprawdź profesję, Odpoczynek i przedsięwzięcia ze świata). **Sprawdź profesję** wysyła na czat, tylko do Ciebie, czy obecny poziom profesji jest ukończony i czego jeszcze brakuje (4. edycja: cechy i 8 umiejętności profesji z 5 × poziom rozwinięciami oraz jeden talent profesji; ścieżki kariery 5. edycji, które system pozwala dodać przy opcji „5e Career Advancement”: postępy na obecnym poziomie; bez tej opcji postać ma karierę z 4. edycji i jest sprawdzana według zasad 4. edycji), razem z Twoimi PD i kosztem awansu albo zmiany profesji. Splecione PS są cały czas widoczne: przy zaklęciu („2/4” w 4e), przy Wietrze (5e) i jako „Utrata splecionej mocy” na górze zakładki Magia. W The Old World: walka (atak, przed którym się bronisz, akcje walki systemu z wariantami Manewru i Szybkość, broń, przeładowanie, zdolności ataku, tarcze i pancerz z Wytrzymałością, wierzchowiec z dosiadaniem i jego atakami, Ekwipunek), umiejętności według cech z pulą kości (np. „4k/3”: 4 kości, czyli tyle k10, ile wynosi cecha, a sukcesem jest każda kość z wynikiem nie większym niż umiejętność, 3; nagłówek kolumny pokazuje wartość cechy), magia (rzucanie z tradycji, zaklęcia z WR i zgromadzoną mocą, pula Miscastów), wiara (Łaska, modlitwy, cud), talenty, zdolności i wiedze, stan (Los, stany, rany z przyciskiem „Dodaj ranę”) oraz przedsięwzięcia ze świata. W Imperium Maledictum: walka (akcje tury, broń z magazynkiem i przeładowaniem, Unik, Inicjatywa, cechy ataku, ochrona, Ekwipunek), cechy, umiejętności ze specjalizacjami według cech, moce psioniczne z Ładunkiem Spaczni i oczyszczeniem, talenty i cechy szczególne oraz stan (Przeznaczenie, stany drobne i poważne, urazy i rany krytyczne). W Wrath & Glory: walka (broń z obrażeniami, KO, PP i salwą, testy Determinacji, Hartu ducha i Przekonania, Inicjatywa, pancerz, Ekwipunek), atrybuty, umiejętności według atrybutów, moce psioniczne, zdolności, talenty i słowa kluczowe, stan (Gniew, Wiara, Spaczenie, stany, urazy i mutacje) oraz Poza walką (test Wpływów, Bogactwo). W Soulbound: walka (broń, Inicjatywa, Hart, pancerz, Ekwipunek), atrybuty i umiejętności z pulą kości i skupieniem, czary i cuda, talenty oraz stan (stany).

* **Lewy klik**: rzut, dodanie stanu lub Przewagi, talent na czat.
* **Prawy klik**: arkusz przedmiotu, zdjęcie stanu lub Przewagi.
* **Najechanie kursorem** (WFRP): podpowiedź z najważniejszymi wartościami (np. obrażenia, grupa i długość broni, cecha i rozwinięcia umiejętności, PZ pancerza, PM, zasięg i czas trwania czaru), opisem i ściągą sterowania.
* **Shift**: tajny rzut MG. **Alt**: pominięcie okna rzutu. **Ctrl + lewy / prawy** na broni i pancerzu: naprawa / uszkodzenie.

## 🏹 Amunicja

W systemach, które ją śledzą (WFRP, Imperium Maledictum, Wrath & Glory): wybór amunicji, przeładowanie i zakładanie broni lub tarczy jednym kliknięciem. Licznik robi się bursztynowy przy małej ilości i czerwony przy braku.

## 🏃 Impet (WFRP, zasady 5. edycji)

System WFRP działa na zasadach 4. edycji (domyślnie) albo 5. edycji (Edition Manager → Use 5e). W zasadach 5. edycji nie ma puli Przewagi, więc duży licznik pokazuje w jej miejsce **Impet**, tak jak karta postaci: **Jest** albo **Brak**. Impet daje +1 do Przewagi w testach Walki Wręcz; system przyznaje go za wygrany w walce test przeciwstawny wręcz albo szarżę i zdejmuje, gdy postać otrzyma obrażenia, przegra test przeciwstawny wręcz, dostanie stan albo walka się skończy. HUD pokazuje te zmiany na bieżąco. MG może też przyznać albo odebrać go ręcznie: **klik** przełącza, **prawy klik** odbiera. Gracze tylko go widzą. Użycia Przewagi są tylko w 4. edycji, więc znikają z panelu akcji, a ramki drużyny pokazują Impet zamiast Przewagi.

## 🖼️ Ramki drużyny

Na starcie ramki są ukryte: włączysz je przyciskiem ramek drużyny w narzędziach tokenów (albo w ustawieniach). W trybie Drużyny pokazują postacie graczy, którzy są teraz zalogowani (przypisaną postać gracza albo postacie, których jest właścicielem); gracze, którzy się wylogują, znikają. Portret, zdrowie, zasoby systemu i stany każdej postaci. **Klik** wskazuje cel, **podwójny klik** przechodzi do tokena, **prawy klik** otwiera kartę. Nagłówek przełącza Drużynę, Walkę i Zaznaczone tokeny, zwija ramki i przesuwa je po przeciągnięciu.

* **Wybierz postacie** (ikona postaci w nagłówku): okno z listą postaci trybu, w którym zaznaczasz, kogo widać. W trybie Drużyny możesz też dodać postać gracza, która nie jest nikomu przypisana. Liczba przy ikonie mówi, ile postaci ukryto. Wybór należy do Ciebie i działa na każdym Twoim komputerze.
* **×** na ramce (po najechaniu) ukrywa tę jedną postać.
* **Ukryj ramki** (oko w nagłówku) chowa cały panel. Wraca przyciskiem ramek w narzędziach tokenów, opcjonalnym skrótem klawiszowym (do ustawienia w Konfiguracji sterowania) albo w ustawieniach modułu.

## 🎯 Token HUD

Cztery szybkie testy z wartościami na HUD tokena. Każdą część można wyłączyć w ustawieniach.

## 🌐 Języki

Angielski i polski są wbudowane. Aby dodać kolejny język:

```bash
npm run lang:add -- de "Deutsch"
```

## 📄 Licencja

MIT – zobacz [LICENSE](LICENSE).

Nieoficjalna twórczość fanowska, niezwiązana z Games Workshop ani Cubicle 7 i przez nie niepopierana. Warhammer i powiązane nazwy są znakami towarowymi Games Workshop Limited. Moduł nie zawiera tekstów ani grafik z podręczników – działa z treściami, które już posiadasz.
