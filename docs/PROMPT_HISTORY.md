# Open-FEM2D-Studio - Volledige Instructie Geschiedenis

Alle instructies die in dit project zijn gegeven, uitgesplitst per deelinstructie.

**Totaal aantal instructies:** 677
**Aantal prompts:** 155
**Periode:** 2026-01-20 - 2026-02-06

---


## 2026-01-20

1. ik wil in deze map een 2D-raamwerkprogramma bouwen

2. Het moet web-based zijn

3. Kun je kijken of er goede solver beschikbaar is open-source hiervoor?

4. Welke solvers zijn er in C++ beschikbaar?

5. Hoe werkt het concept van een web-assembly?


## 2026-01-27

6. Wat staat er in deze map?

7. maak een FEM2D applicatie. Web based. Ga in deep mode


## 2026-01-28

8. Jojo start dit project weer, kijk even wat er allemaal beschikbaar is

9. Ga verder met het bouwen van de applicatie zodat ik uiteindelijk 2D Raamwerken met FEM kan berekenen met krachtsverdeling

10. Ik wil dat je verdergaat met het bouwen van een 2D-raamwerkenprogramma

11. Dit is een programma zoals bijvoorbeeld XFrame 2D of Technosol-raamwerken

12. Ik wil in dit programma uiteindelijk 2D-constructies kunnen bereiken in hout, staal en beton

13. Zowel geometrische lijnconstructies als geometrische vlakconstructies

14. Ook moeten normtoetsingen kunnen worden uitgevoerd en rapportages kunnen worden gedraaid, et cetera

15. In principe wil ik een web-based applicatie hebben, maar laten we eerst beginnen met de basis: dat je een goede solver hebt

16. Volgens mij is die er al ergens in

17. We beginnen met een ligger op twee steunpunten, met een oplegging van scharnieren, roloplegging, inklemming en daarna verende inklemming, verende ondersteuning, et cetera

18. Daarnaast moeten we Q-lasten kunnen opzetten, lijnlasten en puntlasten

19. Daar gaan we dan liggen op drie steunpunten en dan wil ik ook al de verificatieberekeningen erin, totdat je een rapport krijgt om te zien of die berekeningen ook correct zijn

20. Dus ja, kun je daar even mee een begin maken?

21. Het eerste wat ik wil, is dat ik een mockup krijg van de interface, met ook een eerste versie van krachtsverdeling, zodat ik zo snel mogelijk de krachtsverdeling kan beoordelen

22. Als het goed is, gaan we verder met de Userinterface

23. Ik wil dat de achtergrond van dit programma een totaal generiek 2D raamwerk solver heeft, geometrisch niet lineair

24. De toolbar moet een ribbon toolbar zijn en aan de linkerkant krijg ik een soort projectbrowser

25. Aan de rechterkant wil ik een visibility tab, waarbij je aangeeft wat je wilt laten zien

26. Onderin kun je kiezen tussen model en belastinggeval 1, 2 en 3, of hoeveel belastinggevallen er ook zijn

27. Er zitten in ieder geval belastingsgevallen en belastingcommunicaties in

28. Sowieso mag de taal even naar het Engels

29. Dat lijkt me wel even handig

30. En kijk ook even beter voor je mock-up bij allerlei andere raamwerkprogramma's, want ik vind ontwerpen nog vrij matig

31. En de kastvereniging klopt ook niet

32. Dus ik denk niet dat er al echt een goede solver achter zit

33. Verder wil ik ook, als je een node selecteert, dat je een soort gizmo krijgt met het pijltje dat je nog kan wijzigen

34. run the verification tests

35. start de app

36. Point Load

37. Moment Load Edit

38. Trim ik wil dat m +enter move is Onderin kun je wisselen tussen geometrie load-cases en results. Als je in het tabblad geometrie kijkt, zie je alleen de geometrie en ook de automatische maatvoering erbij. In het tabblad load zie je de belastingen

39. dan kun je wisselen tussen de belastingsgevallen. In het tabblad result worden automatisch de resultaten van de constructie weergegeven. De knoppen op de ribbon mogen wat kleiner worden. Als je normaal in het canvas zit met je muis, wil ik dat het gewoon een pijltje is. Als ik een noot selecteer en ik zeg M, Enter, wil ik een verplaatsingsactie kunnen uitvoeren. Ik wil een tapje geometrie aan de loods en zacht vervallen, want die komen gewoon onderhoud

40. voeg automatische maatvoering toe

41. open de app

42. Als ik in een plaatsingsfunctie zit: Bij escape er uit.Ribbon is nog wat rommelig, maar netter. sommige knoppen wat groter andere kleiner

43. How to commit to vertcel

44. /home/maarten/3BM Dropbox/Maarten Vroegindeweij/Vroegindeweij Industries/Impertio Studio BV

45. Kijk daar voor 2 screenshots, verbeter de UI op basis hiervan. Eeerst UI, daarna pas functies

46. Het blijft vrij leleijk. Hoe kunnen we de UI op het niveau brengen van Open 2D Studio?


## 2026-01-29

47. De gizmo bij een node moet zo werken dat als je die selecteerd. Dat je dan met het verslepen de node versleept

48. Ik wil op de maatlijn kunnen klikken en dan een nieuwe maat kunnen invoeren. Dus bij selectie is de tekst ook gelijk geselecteerd

49. Laat het draaien

50. In de geometry tab moeten de results altijd uit staan. de maatvoering moet haaks op de bar staan. Heb je een goede solver op de achtergrond?

51. Bij het tabblad Draw mogen Select en Pen onder elkaar staan, en Beam en Note ernaast

52. Beam hernoemen naar "bar"

53. Beam Load en noemen naar Bar Load

54. Bij het tabblad *Edit, **Move* en *Trim* onder *Copy and Delete* zetten Calculate?

55. Ik wil een bar kunnen plaatsen door op twee punten te klikken

56. Daarna krijg ik automatisch een venster om daarin te selecteren wat voor soort doorsnedeprofiel dit is

57. Pointload moet je ook op een ligger kunnen plaatsen

58. Als ik op een maatlijn klik wil ik een maat in kunnen voeren

59. Als ik op een pointload klik moet er een dialoogvenster openen waar je x, z, waarden in kunt vullen Bij plaatsen van een ‘Bar’ wil ik kunnen snappen naar een node Bij het dubbelklikken op een ‘bar’ wil ik een properties venster zien

60. Hernoem ‘Bar load’ naar ‘Line Load’ Die wil ik plaatsen door op een bar te klikken

61. Ik wil een selectiekleur krijgen rood als ik iets selecteer

62. De pointload ook selecteer maken Er zit een fout in de momentenlijn. Het lijkt erop dat de vorm van M-lijn bij q-load andersom moet

63. Ik wil bij Geometrie geen loads zien. Die wil ik alleen bij het tabje ‘loads’ zien

64. Units wil ik naar mm hebben

65. Sneltoets M moet gelijk werken zonder enter Bij Display settings wil ik ook aan kunnen vinken dat ik de profielnaam zie

66. Ik wil bij het dubbelklikken op een profiel de mogelijkheid om te kiezen uit staal, hout, beton,overig en samengestelde profielen


## 2026-01-30

67. Bij dubbelklikken op node wil ik een diagloogvenster met de afmetingen en x y coordinate

68. En het opleggingstype kunnen wijzigen XY coordinatie hernoemen naar X-Z Overal Dubbelklikken op Line Load → diagloogvenster met grootte Als ik op point cloud klik wil ik een point load aan mijn muis hebben hangen met lijnload ook

69. En dan moet tijdens de plaatsingsactie de bar al highlighten zodat je snapt dat hij die wie snappen Bij het selecteren van een lineload wil ik ‘shapehandels’ links en rechts om de grootte aan te passen Na het plaatsnv an een bar refresh van het canvas geven zodat die zichtbaar wordt; Point ook vrij kunnen plaatsen op een staaf zonder een zichtbare node

70. Bij de projectbrowser een tab invoeren met results

71. Hier opties maken voor: Moment Dwarskracht Oplegreacties Verplaatsen Als je er 1 aanklikt wijzigd de weergave Knop project information toevoegen

72. Dubbelklikken op Line Load → diagloogvenster met grootte, ook selectie Als ik op point cloud klik wil ik een point load aan mijn muis hebben hangen met lijnload ook. En dan moet tijdens de plaatsingsactie de bar al highlighten zodat je snapt dat hij die wie snappen Bij het selecteren van een lineload wil ik ‘shapehandels’ links en rechts om de grootte aan te passen In de plaatsingsactie van een ‘bar’ na de eerste node geplaatst te hebben wil ik alvast een preview zien van de 2e plaatsingsactie dus de staaf die dan meebeweegt aan je cursor. Point ook vrij kunnen plaatsen op een staaf zonder een zichtbare node. De Results bij Proejctbrowser moeten naar een aparte browser toe. Dus project browsers horizontaal tabben

73. Als je er 1 aanklikt wijzigd de weergave Knop project information toevoegen Undo / Redo toevoegen Delete knop → dan verwijder je iets

74. Als je een knoop verwijderd ook gelijk de aansluitende staven verwijderen En de belastingen die daarop staan Een load heeft een ‘load case’. Als je dan in LC1 Dead Load zit wil je alleen die belastingen zien. Als je dan naar Live load gaat wil je alleen die belastingen zien

75. Ook op de home tab bij Load: Load Cases toevoegen als knop En Load Combinations In de ‘move´ verplaatsgingsactie ook al een preview laten zien van de nieuwe locatie van het desbetreffende element

76. Symbool van line load mag anders → breder

77. Bij ‘edit’ Eerste Move daarna Copy Assenstelsel omdraaien. Negatieve last is naar beneden. Gebruik engesel namen overal Linksboven in mag een navigation cube zijn. Daar zie je ook het globale assenstel en met +- de tekenafspraken van Moment, belastingen

78. Als je met je muis op een knop zit krijg je een tooltip. Daar moet tussen haaksjes ook de sneltoets zichtbaar zijn van die functie. Bij buigend moment het assenstel omdraaien qua weergave bij resultaten Bij results een slider toevoegen om de grootte van de moment en dwarskrachten te kunnen wijzigen Bovenin results kunnen kiezen van welk belastingsgeval en/of combinatie het afkomstige is Momenten, dwarskrachten kunnen combineren. Dus bij M / V/ N een checkbox

79. Dubbelklikken op Line Load → diagloogvenster met grootte, ook selectie. Dus niet gecombineeerd met de ‘bar

80. Bij het selecteren van een lineload wil ik ‘shapehandels’ links en rechts om de grootte aan te passen

81. Lineload klopt niet qua orientate. -3 is naar boven gericht, moet andersom

82. Knop project information toevoegen. Op Home tab aan de rechterkant. Dit is een knop waarna een diagloovernster opend met informatie over het project

83. File Save as toevoegen. Ik wil opslaan als .ifc

84. Een load heeft een ‘load case’. Als je dan in LC1 Dead Load zit wil je alleen die belastingen zien. Dat is nu niet the geval

85. Een load heeft ook een load case in het venster

86. Als je dan naar Live load gaat wil je alleen die belastingen zien

87. Load cases knop op ribbon opend een scherm met belastingsgevallen, standaard Dead Load en Live Load

88. Load Combinations knop opend een scherm met daarin de belastingscombinatie. Start met UGT 1.08G+1.35Q en BGT 1.0G+1.0Q

89. Als je met je muis in de buurt van een element komt wil ik al een pre-highlight zin

90. Wat nu op de ribbon resultts staat moet naar de results browser tab

91. Ribbon tab Results laten vervallen

92. Wel een tabblad settings toevoegen op de ribbon. Hier een knop Projectinformation, Calculation Settings, Standards, Reports

93. Knopppen grids, dimensions labels verplaatsen naar display settings scherm aan de rechtserkant van het scherm

94. Wat nu bij tabblad analysis zit moet naar Calculation Settings knop. Daarna kan tab Analysis ook vervallen

95. Tab-tab ‘Edit’ breder maken zodat het geen 3 rijene zijn

96. Als je in ‘select mode’ zit: Bij klikken wil ik een selectiebox kunnen maken. Naar rechtsonder met een solid box en licht groene arcering in het selectievlak

97. Dubbelklikken op Line Load → diagloogvenster met grootte, ook selectie. Dus niet gecombineeerd met de ‘bar

98. Bij het selecteren van een lineload wil ik ‘shapehandels’ links en rechts om de grootte aan te passe

99. Een load heeft een ‘load case’. Als je dan in LC1 Dead Load zit wil je alleen die belastingen zien. Dat is nu niet the geval

100. Als je dan naar Live load gaat wil je alleen die belastingen zien

101. Als je in ‘select mode’ zit: Bij klikken wil ik een selectiebox kunnen maken. Naar rechtsonder met een solid box en licht groene arcering in het selectievlak. Als je naar linksboven gaat hidden line en geen solid. Profilename moet de naam van het profiel bij staal met tussenhaakjes de staalkwaliteit

102. We starten met de Eurocode met Nederlandse Nationale Bijlage. Maak een tabblad in de ribbon: Standards. Voeg een venster bovenin de ribbon toe: Agent

103. De Ribbon moet overal even hoog zijn

104. Bovenin kunnen kiezen voor ‘File – Save As En ook kunnen openen

105. Doorsnede Profiel scherm → Section Hier rechts een preview introduceren van het profiel. Dat moet een soort parametrische tekening zijn. Ook een scherm met doorsnede eigenschappen toevoegen. Scherm mag wat groter en moet een vaste afmeting hebben. Bij Home een knop ‘Grids’ introduceren. Dan opend zich een dialoogvenster waar je enerzijds stramienen kunt invoeren die verticaal staan. Met een tussenafstand. Maar ook horizotnale lijnen die soort van ‘levels’ zijn. Die hebben een peilmaat

106. Bij het selecteren van een lineload wil ik ‘shapehandels’ links en rechts om de grootte aan te passen. Ik zie dat nog niet. Voeg een ‘startpunt’ aan de q-last toe, en ook een lengte

107. Voeg bij Staal in doorsnede profiel een staalkwaliteit toe

108. Voeg bij Hout in doorsnede profiel een houtkwaliteit toe

109. We starten met de Eurocode met Nederlandse Nationale Bijlage. Maak een tabblad in de ribbon: Standards. Voeg een venster bovenin de ribbon toe: Agent

110. Bovenin kunnen kiezen voor ‘File – Save As met dialoogvenster Bij Home een knop ‘Grids’ introduceren. Dan opend zich een dialoogvenster waar je enerzijds stramienen kunt invoeren die verticaal staan. Met een tussenafstand. Maar ook horizotnale lijnen die soort van ‘levels’ zijn. Die hebben een peilmaat

111. De displaysettings werken nog niet goed, check alle knoppen

112. File Save As → Normaal dialoogvenster. Opslaan in IFC

113. Als ik een staaf selecteer wil ik dat die een ‘gizmo’ in het midden heeft. Net als Blender en ook zoals bij de nodes zodat je die kunt verplaatsen. Tijdens een plaatsingsactie wil ik shift kunnen gebruiken om onder een bepaalde hoek iets te tekenen. Voeg ook rotationsnap toe. Dus dat je een snap hebt op 0,22.5, 45, 90 graden bij gebruik van shift Symbool van Z-roller should be changed to At LineLoad the selection box should be that the symbolic part of the line load also leads to selection. Bij een staaf moet je een mogelijkheid hebben om de vrijheidsgraden van de aansluiting links en rechts te kunnen definieren. Dus vrij qua rotatie etc. After change of geometry, calculation should directly update In the settings you should be possible to set units to N, kN etc. aan de onderkant bij In de projectbrowser wil ik bij dubbelklik op een node ook het venster openen Symbool van Z-roller kan beter, een driehoek met 2 cirkels Lineload heeft ook een richting. Ofwel het lokale ofwel het globale assenstels

114. Profilenames moet echt de profielnaam zijn en niet de Area van een section

115. When you see momentlines → the values of moment en shearforce should not interfere. So move if they clash Bij de oplegging wil ik een pijl of momentteken zien van de oplegreacties In Displaysettings maatlijnen aan of uit kunnen zetten bij geometrie weergave De hoogte van Ribbon moet groter zijn. Als je bij browser ‘project’ of ‘results’ hebt is de tekst nu niet zichtbaar met de blauwe selectiekleur

116. Grid size wil je ook in kunnen vullen. Laten varieren van 10 mm tot 1000 mm Ik wantrouw de solver nog. Kun je daar nog eens goed doorheen gaan? Ga in deep mode. Maak 20 verificatieberekeningen. Browser en Display settings in kunnen klappen


## 2026-01-31

117. Open the program, check the status

118. please open

119. Heb je nu zelf een solver gemaakt qua FEM?

120. De vraag is even of dit klopt?

121. Ik zie dingen in M-lijnen die ik niet vertrouw

122. Is het niet beter om een bestaande solver te gebruiken die ook 2e orde GNL en FNL ondersteunt en misschien nog 2D plaatelementen

123. Herschrijf Xara (Opensees) naar pure TypeScript

124. Startpositie moet een absoluut getal zijn in de units van het project

125. De q-last moet ook korter worden na aanpassen

126. Bij het selecteren van een lineload wil ik ‘shapehandels’ links en rechts om de grootte aan te passen. Ik zie dat nog niet. Voeg een ‘startpunt’ aan de q-last toe, en ook een lengte

127. Bij profiel alle termen naar het engels vertalen

128. Bij beton

129. Tabblad Eurocode+NB

130. Betondoorsnede vorm kunnen kiezen, betonkwaliteit, hoofdwapening, beugels etc

131. File – Save As met dialoogvenster

132. Bij Home een knop ‘Grids’ maken. Dan opend zich een dialoogvenster waar je enerzijds stramienen kunt invoeren die verticaal staan. Met een tussenafstand. Maar ook horizotnale lijnen die soort van ‘levels’ zijn. Die hebben een peilmaat

133. Tijdens een plaatsingsactie wil ik shift kunnen gebruiken om onder een bepaalde hoek iets te tekenen. Voeg ook rotationsnap toe. Dus dat je een snap hebt op 0,22.5, 45, 90 graden bij gebruik van shift

134. Move werkt niet meer

135. Symbool van Z-roller should be changed to 2 circels and a triangle

136. Bij een staaf moet je een mogelijkheid hebben om de vrijheidsgraden van de aansluiting links en rechts te kunnen definieren. Momentvast of scharnierend

137. After change of geometry, calculation should directly update

138. Examples subtab can be removed

139. Kijk opnieuw naar de lijnlasten. Als de ligger schuin is moet deze ofwel haaks op de staaf staan of paralele met de globale z-as

140. In the settings you should be possible to set units to N, kN etc

141. When you see momentlines → the values of moment en shearforce should not interfere. So move if they clash

142. Pijlen van de reactie onder de oplegging zetten

143. In Displaysettings maatlijnen aan of uit kunnen zetten bij geometrie weergave

144. De hoogte van Ribbon moet groter zijn, nu zit pan en node in de lijn

145. Als je bij browser ‘project’ of ‘results’ hebt is de tekst nu niet zichtbaar met de blauwe selectiekleur

146. Grid size wil je ook in kunnen vullen. Laten varieren van 10 mm tot 1000 mm

147. Bij Standards kunnen kiezen voor: check standard. Dan vind er een toetsing plaats van een staalprofiel

148. Bij projectlocation ook een locatie in kunnen voeren

149. Maak een eerste stap met het genereren van een rapport

150. e versie van staaltoetsing opnemen van een staaf. Ik wil een volledig transparante uitvoer. Dus ook normformules inclusief ingevulde versie, UC etc

151. Voorstel doen qua rapport preview

152. Bij de vervormingslijn ook de vervormingslijn van de staaf laten zien

153. Tabbed files. Dat je dus meerdere bestanden kunt openen naast elkaar

154. Bar → symbool

155. Als je vanuit niets een staaf plaats wil je dat die altijd snapt op 100 mm

156. Bij het plaats van een ‘bar’ , de mogelijkheid hebben om een lengte in te voeren na het plaatsen van de eerste node

157. Nadat je de eerste staaf getekend hebt: wil je dat de 2e automatisch doorgaat. Zonder dat er opnieuw naar het profiel gevraagd wordt

158. Als je een load plaatst automatisch switchen naar ‘ load view’

159. Resultopties uit display settings halen en naar results brengen

160. Bij resultaten ook kunnen kiezen voor belastingcombinaties

161. Ook een vinkje voor ‘envelop’

162. Dwarskracht-afschuiftekens toevoegen

163. In het veldmoment de waarde plaatsen onderin de lijn

164. Mogeijkheid hebben om

165. Build de tool naar een losse applicatie. Dat moet zo in elkaar zitten dat het altijd draait in een frame wat onafhankelijk van de applicatie is. In dat frame zit een terminal die instructies stuurt naar de applicatie. Dan kan ik dus blijven ontwikkelen op deze applicatie

166. Mogelijkheid om te kiezen tussen Geometrisch Niet Lineair en Geometrisch Lineair rekenen

167. All of them

168. Maak ook een tab: 3D Preview

169. Daar zie je de constructie in 3D

170. open de applicatie

171. De tabs moeten op het canvas zitten

172. Niet boven de applicatie

173. Die moeten dan verschillende bestanden krijgen

174. Dus dat je 5 bestanden tegelijk kunt openen met hele andere constructies

175. Ik wilde tevens een zelfstandige applicatie in plaats van een webpagina

176. Asl ik op 'results' klik(dat is nu uitgegrijsd) wil ik dat de berekeningen automatisch start

177. Auto recalculate knop kan weg

178. Dat wil ik standaard aan hebben

179. The AI Agent werkt niet

180. Zorg dat hij middels een achterliggende claude terminal werkt

181. Bij de staven moet een soort vinkje komen met 'UC'

182. Bij projectgegevens kunnen koppelen met ERP-Next

183. Breid het ook uit naar 2D EEM plaat element

184. Je kunt dus een schijf tekenen in aanzicht

185. Maak dit eerst alleen rechthoek

186. Daarin een mesh met driehoekselmenten

187. Op de edges kun je belastingen zetten

188. run the dev server so I can test the plate tool

189. there's an error in the console, can you check?


## 2026-02-02

190. open de site

191. Ok hier komt een enorme lijst

192. Maak een uitgebreid

193. Controleer zelf naderhand met een checklist of alles verwerkt is en geef een rapport met eventuele kanttekeningen op punten die niet gelukt zijn

194. Als ik een node wil plaatsen vanuit niets moet die ook snappen naar het grid, ook tijdens de plaatsingsactie. Dus terwijl die nog aan je muis hangt zie je al een snap naar een grid

195. Bar symbool moet anders. Het is nu een lijn, moet met 2 bollen eraan zijn. Dus bol begin en bol eind

196. Bij q-last ook een mogelijkheid om een verlopende q-last in te voeren

197. Qx bij de q-last visualiseren als apart blok met pijlen paralele aan de last, in andere kluer

198. Als je op de ligger dubbelklik mag je nooit de q-last scherm krijgen. Die moet je alleen krijgen als je binnen het vak van de q-last iets selecteerd

199. Bij profiel alle termen naar het engels vertalen

200. Doorsnede Profiel, Staal,, Hout, beton

201. Beton tab bij doorsnede profiel uitbreiden

202. Tabblad Eurocode+NB

203. Betondoorsnede vorm kunnen kiezen, betonkwaliteit, hoofdwapening, beugels etc

204. Bij Grids: + en – symbool onder elkaar zetten. Gridhead mag wat groter. Als je op de maatlijn klik van het stramien wil je die maat aan kunnen passen

205. Show grid lines on canvas en ‘Snap to grid lines’ moet uit het venster van Structural Grids naar Display Settings

206. Peilmaat → Elevation

207. Stramienen → Grids

208. Bij een staaf alle aansluitingen kunnen definieren. Dus Tx, Ty,Tz, Rx, Ry, Rz, en voor het einde ook. Dan ook 2 knoppen erbij

209. Fully fixed en Hinge

210. Bij plaatelementen. Als je voor een plaatfunctie kiest wil ik een soort van edit mode komen waar je met behulp van rechtelijnen een vorm kunt tekenen. En ook een knop met sparing waarmee je een sparing in de plaat kunt zetten. Daarna klik je op ‘finish’. Dan wordt de plaat gemaakt en gemesht

211. Kunnen kiezen voor rechthoekige en driehoekselementen

212. Mesher met vierhoekselementen

213. Bij resultaten ook plaatresultaten kunnen weergeven

214. Knopen in de plaat. Die hebben een andere kleur, zijn kleiner, nummering start vanaf 1000

215. Ik wil ook een nieuw type knoop introduceren. Dat is een subknoop. Die kan op een staaf geplaatst worden. Die beweegt mee met de staaf. Maar knipt de staaf niet in tween in de UI. Onderliggend gebeurt dit wel zodra je gaat berekenen. Je kunt deze knoop gebruiken om een oplegging onder te zetten, maar ook om een puntlast op te plaatsen

216. Q-lasten moeten boven elkaar geplaatst kunenn worden

217. Een edge load op een plate moet niet opgeknipt worden in puntlasten maar echt zicthbaar zijn als q-last

218. After change of geometry, calculation should directly update

219. During moven calculation should also update

220. Kijk opnieuw naar de lijnlasten. Als de ligger schuin is moet deze ofwel haaks op de staaf staan of paralele met de globale z-as

221. In the settings you should be possible to set units to N, kN etc

222. When you see momentlines → the values of moment en shearforce should not interfere. So move if they clash

223. Pijlen van de reactie onder de oplegging zetten

224. In Displaysettings maatlijnen aan of uit kunnen zetten bij geometrie weergave

225. De hoogte van Ribbon moet groter zijn, nu zit pan en node in de lijn

226. Als je bij browser ‘project’ of ‘results’ hebt is de tekst nu niet zichtbaar met de blauwe selectiekleur

227. Grid size wil je ook in kunnen vullen. Laten varieren van 10 mm tot 1000 mm

228. Bij Standards kunnen kiezen voor: check standard. Dan vind er een toetsing plaats van een staalprofiel

229. Bij projectlocation ook een locatie in kunnen voeren

230. Maak een eerste stap met het genereren van een rapport

231. e versie van staaltoetsing opnemen van een staaf. Ik wil een volledig transparante uitvoer. Dus ook normformules inclusief ingevulde versie, UC etc

232. Voorstel doen qua rapport preview

233. Bij de vervormingslijn ook de vervormingslijn van de staaf laten zien

234. Tabbed files. Dat je dus meerdere bestanden kunt openen naast elkaar

235. Bar → symbool

236. Als je vanuit niets een staaf plaats wil je dat die altijd snapt op 100 mm

237. Bij het plaats van een ‘bar’ , de mogelijkheid hebben om een lengte in te voeren na het plaatsen van de eerste node

238. Nadat je de eerste staaf getekend hebt: wil je dat de 2e automatisch doorgaat. Zonder dat er opnieuw naar het profiel gevraagd wordt

239. Als je een load plaatst automatisch switchen naar ‘ load view’

240. Resultopties uit display settings halen en naar results brengen

241. Bij resultaten ook kunnen kiezen voor belastingcombinaties

242. Ook een vinkje voor ‘envelop’

243. Knop ‘New toevoegen

244. Nadat je een plate verwijderd onthoud hij iets nog van die plate zodat je niet kunt rekenen. Je krijgt dan een foutmelding

245. Dwarskracht-afschuiftekens toevoegen

246. In het veldmoment de waarde plaatsen onderin de lijn

247. Build de tool naar een losse applicatie. Dat moet zo in elkaar zitten dat het altijd draait in een frame wat onafhankelijk van de applicatie is. In dat frame zit een terminal die instructies stuurt naar de applicatie. Dan kan ik dus blijven ontwikkelen op deze applicatie

248. Bij settings → Calculation Settings. Hier kun je kiezen wat voor rekenmodel je wilt gebruiken en solver, mesher etc. Die gaan dan dus van de settings tab af naar een apart dialoogvenster

249. Verplaatsingen moeten meetbaar zijn

250. mm weergevne

251. in 3D hoeven opleggingen niet zichtbaar te zijn. Navigatie qua pannen e.d. omdraaien

252. Bij File IFC 1 laag naar beneden. Bij Draw 1 kolom toevoegen en grids 1 kolom opschuiven

253. Als ik op de uc dubbelklik wil ik dat er een aparte tab erbij komt: Code-Check. There is a report with transparant calculations

254. Maak een volledig werkende API

255. Zorg dat de AI-agent gekoppeld is met een terminal en dat die met de API van het programma gekoppeld is zodat je via AI elementen kunt toevoegen in het programma

256. Q-lasten verlopend kunnen maken. Knop zodat je q1 en q2 kunt unlocken

257. Bij het kiezen van een q-last wil ik een koppeling met OpenReport om belastingen op te halen

258. Mogelijkheid om staal/hout/betonprofiel breedte zichtbaar te maken in het canvas. Dus de maximale breedte moet dan zichtbaar zijn

259. Gebruik bij de 3D-view het ThatOpenCompany Framework

260. Ook een 3D- navigation cube

261. Bij de barproperties komt een tabblad NEN-EN 1993-1. Dat gaat over NL staaltoetsing. Daar kies je de staalkwaliteit, kipsteunen, kiplengte info, etcetera

262. Voeg een temperatuursbelasting toe

263. Als je dubbelklikt op een plate krijg je een eigenschappen venster van de plate

264. Bij Display Settings: Zoom In, Zoom Out en Fit All mogen vervallen

265. Die kleine knopen van de mesh mag je niet kunnen moven

266. Voor de resultaten van een plaat: Kijk even bij https://wiki.struct4u.com/wiki/Plate_stresses/forces

267. ben je nog bezig?

268. wat is de status?

269. commit alles behalve node_modules en dist

270. Bar symbool moet anders. Het is nu een lijn, moet met 2 bollen eraan zijn. Dus bol begin en bol eind

271. Bij q-last ook een mogelijkheid om een verlopende q-last in te voeren

272. Qx bij de q-last visualiseren als apart blok met pijlen paralele aan de last, in andere kluer

273. Als je op de ligger dubbelklik mag je nooit de q-last scherm krijgen. Die moet je alleen krijgen als je binnen het vak van de q-last iets selecteerd

274. Bij profiel alle termen naar het engels vertalen

275. Doorsnede Profiel, Staal,, Hout, beton

276. Beton tab bij doorsnede profiel uitbreiden

277. Tabblad Eurocode+NB

278. Betondoorsnede vorm kunnen kiezen, betonkwaliteit, hoofdwapening, beugels etc

279. Bij Grids: + en – symbool onder elkaar zetten. Gridhead mag wat groter. Als je op de maatlijn klik van het stramien wil je die maat aan kunnen passen

280. Show grid lines on canvas en ‘Snap to grid lines’ moet uit het venster van Structural Grids naar Display Settings

281. Peilmaat → Elevation

282. Stramienen → Grids

283. Bij een staaf alle aansluitingen kunnen definieren. Dus Tx, Ty,Tz, Rx, Ry, Rz, en voor het einde ook. Dan ook 2 knoppen erbij

284. Fully fixed en Hinge

285. Bij plaatelementen. Als je voor een plaatfunctie kiest wil ik een soort van edit mode komen waar je met behulp van rechtelijnen een vorm kunt tekenen. En ook een knop met sparing waarmee je een sparing in de plaat kunt zetten. Daarna klik je op ‘finish’. Dan wordt de plaat gemaakt en gemesht

286. Kunnen kiezen voor rechthoekige en driehoekselementen

287. Mesher met vierhoekselementen

288. Bij resultaten ook plaatresultaten kunnen weergeven

289. Knopen in de plaat. Die hebben een andere kleur, zijn kleiner, nummering start vanaf 1000

290. Ik wil ook een nieuw type knoop introduceren. Dat is een subknoop. Die kan op een staaf geplaatst worden. Die beweegt mee met de staaf. Maar knipt de staaf niet in tween in de UI. Onderliggend gebeurt dit wel zodra je gaat berekenen. Je kunt deze knoop gebruiken om een oplegging onder te zetten, maar ook om een puntlast op te plaatsen

291. Q-lasten moeten boven elkaar geplaatst kunenn worden

292. Een edge load op een plate moet niet opgeknipt worden in puntlasten maar echt zicthbaar zijn als q-last

293. After change of geometry, calculation should directly update

294. During moven calculation should also update

295. Kijk opnieuw naar de lijnlasten. Als de ligger schuin is moet deze ofwel haaks op de staaf staan of paralele met de globale z-as

296. In the settings you should be possible to set units to N, kN etc

297. When you see momentlines → the values of moment en shearforce should not interfere. So move if they clash

298. Pijlen van de reactie onder de oplegging zetten

299. In Displaysettings maatlijnen aan of uit kunnen zetten bij geometrie weergave

300. De hoogte van Ribbon moet groter zijn, nu zit pan en node in de lijn

301. Als je bij browser ‘project’ of ‘results’ hebt is de tekst nu niet zichtbaar met de blauwe selectiekleur

302. Grid size wil je ook in kunnen vullen. Laten varieren van 10 mm tot 1000 mm

303. Bij Standards kunnen kiezen voor: check standard. Dan vind er een toetsing plaats van een staalprofiel

304. Bij projectlocation ook een locatie in kunnen voeren

305. Maak een eerste stap met het genereren van een rapport

306. e versie van staaltoetsing opnemen van een staaf. Ik wil een volledig transparante uitvoer. Dus ook normformules inclusief ingevulde versie, UC etc

307. Voorstel doen qua rapport preview

308. Bij de vervormingslijn ook de vervormingslijn van de staaf laten zien

309. Tabbed files. Dat je dus meerdere bestanden kunt openen naast elkaar

310. Bar → symbool

311. Als je vanuit niets een staaf plaats wil je dat die altijd snapt op 100 mm

312. Bij het plaats van een ‘bar’ , de mogelijkheid hebben om een lengte in te voeren na het plaatsen van de eerste node

313. Nadat je de eerste staaf getekend hebt: wil je dat de 2e automatisch doorgaat. Zonder dat er opnieuw naar het profiel gevraagd wordt

314. Als je een load plaatst automatisch switchen naar ‘ load view’

315. Resultopties uit display settings halen en naar results brengen

316. Bij resultaten ook kunnen kiezen voor belastingcombinaties

317. Ook een vinkje voor ‘envelop’

318. Knop ‘New toevoegen

319. Nadat je een plate verwijderd onthoud hij iets nog van die plate zodat je niet kunt rekenen. Je krijgt dan een foutmelding

320. Dwarskracht-afschuiftekens toevoegen

321. In het veldmoment de waarde plaatsen onderin de lijn

322. Build de tool naar een losse applicatie. Dat moet zo in elkaar zitten dat het altijd draait in een frame wat onafhankelijk van de applicatie is. In dat frame zit een terminal die instructies stuurt naar de applicatie. Dan kan ik dus blijven ontwikkelen op deze applicatie

323. Bij settings → Calculation Settings. Hier kun je kiezen wat voor rekenmodel je wilt gebruiken en solver, mesher etc. Die gaan dan dus van de settings tab af naar een apart dialoogvenster

324. Verplaatsingen moeten meetbaar zijn

325. mm weergevne

326. in 3D hoeven opleggingen niet zichtbaar te zijn. Navigatie qua pannen e.d. omdraaien

327. Bij File IFC 1 laag naar beneden. Bij Draw 1 kolom toevoegen en grids 1 kolom opschuiven

328. Als ik op de uc dubbelklik wil ik dat er een aparte tab erbij komt: Code-Check. There is a report with transparant calculations

329. Maak een volledig werkende API

330. Zorg dat de AI-agent gekoppeld is met een terminal en dat die met de API van het programma gekoppeld is zodat je via AI elementen kunt toevoegen in het programma

331. Q-lasten verlopend kunnen maken. Knop zodat je q1 en q2 kunt unlocken

332. Bij het kiezen van een q-last wil ik een koppeling met OpenReport om belastingen op te halen

333. Mogelijkheid om staal/hout/betonprofiel breedte zichtbaar te maken in het canvas. Dus de maximale breedte moet dan zichtbaar zijn

334. Gebruik bij de 3D-view het ThatOpenCompany Framework

335. Ook een 3D- navigation cube

336. Bij de barproperties komt een tabblad NEN-EN 1993-1. Dat gaat over NL staaltoetsing. Daar kies je de staalkwaliteit, kipsteunen, kiplengte info, etcetera

337. Voeg een temperatuursbelasting toe

338. Als je dubbelklikt op een plate krijg je een eigenschappen venster van de plate

339. Bij Display Settings: Zoom In, Zoom Out en Fit All mogen vervallen

340. Die kleine knopen van de mesh mag je niet kunnen moven

341. Voor de resultaten van een plaat: Kijk even bij https://wiki.struct4u.com/wiki/Plate_stresses/forces

342. werk de niet geïmplementeerde punten af

343. Ik wil bij de bibliotheek met staalprofielen meer properties van een profiel, A, Iy, Iz, Wy, Wz

344. werk de 6 niet geïmplementeerde punten af en de punten die beter kunnen

345. Als ik in de plaatsingsactie van een ligger zit wil ik kunnen afsluiten met een rechtsklik. De rechtsklik moet niet een knoop plaatsen

346. Hetzelfde voor alle andere plaatsingsacties, niet alleen liggers

347. Ik mis nog de verlopende q-lasten

348. Dus bij een lijnlast een mogelijkheid geven om een waarde links en rechts in te vullen zodat deze verloopt

349. Ook de grafische weergave aanpassen

350. Solver error: Model must have at least 1 triangle element

351. Is dat snel genoeg?

352. Past CGAL in mijn OS licentie?

353. Ok implementeer maar!

354. Open het programma

355. Bar symbool moet anders. Het is nu een lijn, moet met 2 bollen eraan zijn. Dus bol begin en bol eind. Ik heb dit inmiddels 10x gevraagd. PAS HET AAN! EEN ANDER SYMBOOL OP DE RIBBON. Een strip is geen bar. Ik wil een bol zien dan een lijn en dan weer een bol

356. Bij q-last ook een mogelijkheid om een verlopende q-last in te voeren. Dus qz1 en qz2. Standaard zijn die gelijk, maar als je de waarde van qz2 aanpast wordt deze verlopend

357. Qx bij de q-last visualiseren als apart blok met pijlen paralele aan de last, in andere kluer

358. Als je op de ligger dubbelklik mag je nooit de q-last scherm krijgen. Die moet je alleen krijgen als je binnen het vak van de q-last iets selecteerd

359. Bij change section (Doorsnede Profiel) alle termen naar het engels vertalen

360. Doorsnede Profiel, Staal,, Hout, beton

361. Beton tab bij doorsnede profiel uitbreiden

362. Tabblad Eurocode+NB

363. Betondoorsnede vorm kunnen kiezen, betonkwaliteit, hoofdwapening, beugels etc

364. Bij een staaf alle aansluitingen kunnen definieren. Dus Tx, Ty,Tz, Rx, Ry, Rz, en voor het einde ook. Dan ook 2 knoppen erbij

365. Fully fixed en Hinge

366. Vierhoekslementen implementeren in plaats van driehoekslementen. De contour van de plaat moet leidend zijn. De buitenste contour van de plaat moet soort van gelockt zijn zodat je naderhand nog gemakkelijk de hoeken kunt wijzigen en dat de hele vorm dan anders wordt maar wel van hoekpunt tot hoekpunt

367. Bij resultaten ook plaatresultaten kunnen weergeven

368. Knopen in de plaat. Die hebben een andere kleur, zijn kleiner, nummering start vanaf 1000. In de projectbrowser ook apart groeperen

369. Ik wil ook een nieuw type knoop introduceren. Dat is een subknoop. Die kan op een staaf geplaatst worden. Die beweegt mee met de staaf. Maar knipt de staaf niet in tween in de UI. Onderliggend gebeurt dit wel zodra je gaat berekenen. Je kunt deze knoop gebruiken om een oplegging onder te zetten, maar ook om een puntlast op te plaatsen

370. Mogelijkheid om meerdere lineloads per staaf te hebben

371. Een lineload heeft ook een description

372. Die zie je ook in het scherm

373. De lineload met de kleinste waarde stapeld op de grootste. Een punlast moet er ook weer bovenop staan

374. Een edge load op een plate moet niet opgeknipt worden in puntlasten maar echt zicthbaar zijn als q-last

375. Als je resultaten aan hebt en het resultaat is berekend en je sleept aan een knoop: Dan wil ik continue het resultaat zien updaten

376. In the settings you should be possible to set units to N, kN etc

377. When you see momentlines → the values of moment en shearforce should not interfere. So move if they clash

378. Buigingsteken voor je momentlijn

379. Pijlen van de oplegreactie: Ry → Rz worden

380. Bij een maatlijn voor de geometrie deze ook aan kunnen passen. Als je er op dubbelklik een dialoogvenster waar je de maat kunt wijzigen

381. Bij Project Information: Project Number, Project Name

382. Bij Standards kunnen kiezen voor: check standard. Dan vind er een toetsing plaats van een staalprofiel

383. Bij Settings: Calculation Settings introduceren. GNL, GL, P-Delta etc. 2D Frame analysis moeten hierin ingesteld zijn

384. Table en PDF knop verwijderen

385. Bij standards: Dropdown waar je uit standards kunt kiezen. Nu alleen EC+NL NB

386. Bij projectlocation ook een locatie in kunnen voeren. Dat moet een GIS-kaart zijn

387. Maak een eerste stap met het genereren van een rapport

388. e versie van staaltoetsing opnemen van een staaf. Ik wil een volledig transparante uitvoer. Dus ook normformules inclusief ingevulde versie, UC etc

389. Voorstel doen qua rapport preview

390. Tabbed files. Dat je dus meerdere bestanden kunt openen naast elkaar. Nu is dat nog hetzelfde bestand

391. Resultas onder displaysettings weghalen. Die moeten naar de Browser → Results

392. Results als tab op de ribbon weghalen

393. Envelop toevoegen bij Browser / Results

394. Knop ‘New toevoegen

395. Nadat je een plate verwijderd onthoud hij iets nog van die plate zodat je niet kunt rekenen. Je krijgt dan een foutmelding

396. Dwarskracht-afschuiftekens toevoegen

397. Build de tool naar een losse applicatie. Dat moet zo in elkaar zitten dat het altijd draait in een frame wat onafhankelijk van de applicatie is. In dat frame zit een terminal die instructies stuurt naar de applicatie. Dan kan ik dus blijven ontwikkelen op deze applicatie

398. Verplaatsingen moeten meetbaar zijn

399. mm weergevne

400. Deflections als aparte Result weergeven

401. Bij Results kunnen kiezen tussen bij Load Case ook voor combinations

402. in 3D hoeven opleggingen niet zichtbaar te zijn. Navigatie qua pannen e.d. omdraaien

403. Als ik op de uc dubbelklik wil ik dat er een aparte tab erbij komt: Code-Check. There is a report with transparant calculations

404. Maak een volledig werkende API

405. Zorg dat de AI-agent gekoppeld is met een terminal en dat die met de API van het programma gekoppeld is zodat je via AI elementen kunt toevoegen in het programma. Gebruik hiervoor het lokale AI-model wat hier op deze pc staat

406. Mogelijkheid om staal/hout/betonprofiel breedte zichtbaar te maken in het canvas. Dus de maximale breedte moet dan zichtbaar zijn. Dat is een aparte displaysetting

407. Bij de barproperties komt een tabblad NEN-EN 1993-1. Dat gaat over NL staaltoetsing. Daar kies je de staalkwaliteit, kipsteunen, kiplengte info, etcetera

408. Units properties moeten uit Display Settings → Calculation Settings halen

409. Bij Edge Load: Niet limiteren tot Top/Left/Right

410. Als je dubbelklikt op een plate krijg je een eigenschappen venster van de plate

411. Die kleine knopen van de mesh mag je niet kunnen moven

412. Voor de resultaten van een plaat: Kijk even bij https://wiki.struct4u.com/wiki/Plate_stresses/forces. Deze graag volledig implementeren. Ook

413. Ik wil een staal toetsingsmodule bouwen volgens de Eurocode. Laat je inspireren door dit voorbeeld: /home/maarten/Desktop/TEMP/2916-CB-21 Constructieberekening Bijlage A.pdf

414. Als je dubbelklikt op een staaf wil ik een venster openen waarin je de toetsing ziet. Maar ik wil ook dat bij Standards zichtbaar kunt krijgen wat maatgevend is. Buiging, Kip, Doorbuiging

415. Je moet dan ook instellen wat de vervomingseis van een staaf is

416. De section editor voor staal wil ik sterk verbeteren. Zoek op Github naar een Open Source section editor en library. Dat je zowel een grote bilbiotheek aan staalprofielen hebt alsmede een mogelijkheid om bij samengesteld profiel een samengestelde doorsnede te berekenen qua doorsnede-eigenschappen

417. Bij Standards een materialen venster kunnen openen

418. Dit krijgt ik bij een simpele rechthoekige plaat: Solver error: Matrix is singular or nearly singular at column 2

419. D viewer wijzigen in IfcOpenShell WASM. Ik wil dat de I-profielen ook echt kloppen

420. Integreer de staalbibliotheek uit dit bestand: https://github.com/OpenAEC-Foundation/INB-Template/blob/main/INB-Library%200.1.ifc

421. Neem de hele lijst die ik gevraagd hebt

422. En controleer of alle features volledig geimplementeerd zijn

423. Alles wat niet 100% geimplementeerd is alsnog oppakken

424. Ook als het erg veel werk is

425. Check of deze lijst verwerkt is

426. fix #37 en #59

427. Als ik nu een hoekpunt van een plate verplaat gaat alleen dat betreffende elemnent om. Ik wil een overkoepelende element-vorm aanhouden waarbij je, als je de hoeken wijzigd de lijn vanaf de oorspronkelijke andere hoek gewijzigd wordt en de plaat opnieuw gemeshed wordt

428. Ik wil dat het rapport modulair opgebouwd is. Een gedeelte over geometrie, ook met afbeeldingen en maatvoering, belastingsgevallen, belastingscombinaties, profieleigenschappen, etc

429. Is IfcOpenShell WASM geintegreerd?

430. Ik heb dat gezegt, waarom doe je het dan niet?

431. Alle staalprofielen die in dit bestand stana: Integreer de staalbibliotheek uit dit bestand: https://github.com/OpenAEC-Foundation/INB-Template/blob/main/INB-Library%200.1.ifc Graag toevoegen aan de bibliotheek

432. Alsmede deze met de juiste IFC-definitie maken dat die in de 3D viewer getoont worden

433. Ik wil daar 2 opties. 1 Geometrie 3D en 1 rekenmodel 3D

434. Maak de agent intelligenter

435. Hij is nu heel erg dom

436. Ik wil dat via Claude werkt

437. Dus koppelen via een virtuele terminal

438. Betreft de mesher voor polygonen

439. Zorg ervoor dat deze op de edges aansluiten!

440. Er moet een fatsoenlijke open source mesher zijn voor vierhoekige elementen

441. Ontwikkel ook een 'edge' element

442. Dat is als het ware de boundary van een element

443. Die zorgt ervoor dat de elementen daarbinnen altijd aangesloten zijn en blijven

444. Maar je kunt hier ook belastingen op plaatsen

445. Zodat die als het ware aan de rand kleven

446. Ik zie nog steeds geen ifcopenshell bij de 3D preview, waarom neit?

447. Sloop ThreejS eruit

448. Ik wil IfcOpenShell inclusief correcte weergave staalprofielen, is de database al geintegreerd?

449. De rand is nog steeds wijzigbaar. Ik wil dat de originele contour behouden blijft en ook wijzigbaar is. en dat de mesh daarbinnen wijzigd

450. Maak de edge ook sleepbaar net als een beam in het midden

451. MOgelijkheid om de meshgrootte in de plaat aan te passen in het dialoogvenster van de plaat

452. Edgeload en lineload samenvoegen

453. Een lineload moet ook op de edge geplaatst kunnen worden

454. De moet ook weergegeven zijn lineload

455. Onderliggend kun je deze opsplitsen in puntlasten

456. Zorg ervoor dat de hoeken van de plate ook sleepbaar zijn net al een gewone node

457. Als je een edge sleept moet de oplegging en de belastingen behouden blijven

458. Verplaatse de legenda naar linksovenin

459. Integreer meer soorten spanningen/krachten onder stresses onder results

460. Hernoem stresses naar --> Plate stresses/forces. https://wiki.struct4u.com/wiki/Plate_stresses/forces

461. Voeg een '+' toe als je de plate geselecteerd hebt

462. Dan kun je daar een void opening toevoegen

463. Tijdens het tekenen van de polygoon ook de mogelijkheid hebben om een arc te tekenen als ronding


## 2026-02-03

464. Als ik een edge versleep moet de belasting meegaan

465. After using the 'grid' screen 'Show grid lines' should automalicly turn on'

466. When selecting a plate, there should be a '+' on the screen to add a void

467. When changing a plate property after finish recalculate

468. Add all the units from the plate stresses to the Calc Settings

469. Standard for stress: N/mm2

470. Build also a deformed shape for a plate

471. When double click on a grid--> open the grid dialog

472. Improve the mesher zo dat die ook alleen vierhoekslementen aan kan

473. Betreft het locken van een bar en node aan een grid

474. Ik wil dat dat ook werkt als je een knop naderhand versleept op het grid

475. Daarna moet die gelockt worden

476. Als je de node moved wordt de relatie weer verbroken

477. INTEGREER EEN NIEUW TABBLAD 3D: DIT MOET MET IFCOPENSHELL WASM. KIJK HIER: WWW.AECO.DEV

478. Bij het tekenen van een void op de plaat: Als ik op het 'plusje' klik moet je in de edit mode voor de void komen waar je de dus de lijnen kunt tekenen

479. Loop ook even de mesher na om te kijken of deze goed omgaat met de openenigen en dat de elementen niet door de opening heen lopen

480. Als ik start met 'Plate' wil ik dat je direct in de polygon mode komt

481. Dus niet meer de 'rectangle-mode'

482. Bij Sections in project browser wil ik kunnen dubbelklikken op een section om de eigenschappen te zien

483. Ik wil daar een plusje om een section toe te voegen

484. Het toevoegen van een sparing bij een plate werkt nog niet goed

485. Ik wil bij de weergave van de spanningen bij de resultstab een optie krijgen of je de kleuren per element laat zien(integration point) Of dat er een gradient gemaakt wordt in het element

486. Ik kan nog steeds geen sparing toevoegen bij de plaat

487. Nadat je op de plus klikt moet je in de edit mode komen van een void

488. De plate moet ook in deformed state weergegeven kunnen worden. Er zit nog een fout in de mesher als je openingen gebruikt

489. Normals visualisation(trajectory) both for 'v' as for 'm'

490. Het werkt niet!! Test het zelf. Dit is de 8e keer dat ik het zeg

491. Implemteer deformed shape ook voor de plate. DUs dat je de vervorming van de plate ziet

492. Ik wil dat als je een void toevoegd dat je dan in een soort edit mode komt waar de mesh onzichtbaar is. Je ziet dan de contour van de plaat en in rood de void, net als bij de plaatsingsactie

493. Move should have 2 shortcuts. Beside of M also G

494. Het meshen rondom de opening gaat nog niet goed

495. Er lopen lijn dwars door de sparingen heen

496. test het met een void

497. Het probleem is dat je in de editfunctie niet je plaatsingsacties ziet

498. Ik zie geen opening verschijnen tot het moment dat je de opening sluit

499. Verder wil ik bij het editen van platen een soort blender-aanpak

500. Je selecteerd de plaat

501. Dan kom je in de edit mode

502. Als je in de edit mode een selectie maakt dan van 2 knopen

503. Dan klik je op 'G' of 'M' dan start de move actie waarbij je ook shift kunt gebruiken en een losse maat in kan geven

504. De mesher is weer fout. Het is nu een rechthoekig verhaal die niet goed op de randen aansluiten

505. Nadat je de edge aanpast moet de mesh geupdate worden. Dat gebeurt nu niet

506. Ik zie in de dit-mode nog steeds geen lijnen van een void als ik die probeer te tekenen

507. Ik zie nog steeds groene lijnen door de opening heen. Het meshen is wel goed gegaan, maar dit lijken soort van hulplijnen die eigenlijk weg moeten

508. In het scherm van 'Plate Element' wil ik de hele Drawing mode weghalen. Het moet standaard 'Polygon' methode zijn

509. Als ik een plaat selecteer wil ik middels 'tab' in de edit-mode komen

510. Het werkt niet, vermoedelijk moet je een soort van overrule op de tab functie doen i.g.v. de plaat geselecteerd is. Zodat je niet tabt naar bv de zoom + en - in het canvs

511. Als ik de hoekpunt van een plaat versleep en het hoekelement krijgt een zodanige vorm dat de edge met elkaar clashed

512. Dan werkt het groter maken van de plaat niet meer

513. plan de mixed beam+plate analyse


## 2026-02-04

514. Start met maken een rapport met een fatsoenlijk preview

515. Dit moet een aparte tab in de ribbon zijn

516. Dit is een giga groot project wat ik echt super gecontroleerd wil oppakken

517. Zodat het rapport uitbreidbaar is naar een toetsing van alle soorten constructies, materialen en normen

518. En ook nog aanpasbaar in een soort van report generator met allerlei instellingen

519. Kijk voor de inspiratie naar een uitdraai in dit pdf-bestand vanaf pagina 12: /home/maarten/SynologyDrive/50_projecten/3_3BM_bouwtechniek/2978 Doorbraak Zwaluwenburg 15, Dordrecht/21_post_UIT/01 27-01-2026 concept/2978-CB-21 Constructieberekening.pdf

520. Ik wil dat je nu afbeeldingen gaat integreren vanuit het rekenmodel

521. Dus oa: Geometry, M-lijn ULS, V-lijn ULS, reacties, verplaatstingen bij BGT 6.14

522. Die moeten dus uit het model komen

523. Ik wil ook een node-editor implementeren

524. Daarin is de volledige API beschikbaar als nodes

525. Maar ook allerlei standaard Python nodes

526. Je kunt hiermee Graphs bouwen net als Grasshopper en Dynamo om parametrische constructies te bouwen

527. Stop dit in een apart tabblad

528. In dat tabblad wil ik eigenlijk een ook geometrische preview zien van wat het resultaat is van wat je aan het doen bent

529. De preview is nog steeds niet goed

530. Verbeter de weergave van de M-lijn en V-lijn

531. Laten zien welke belastingsgeval/combinatie het is

532. De M-lijn moet gespiegeld worden

533. Oplegreactie weergeven

534. Maar nu wil ik ook nog een node editor erbij

535. Dus nog een tabblad

536. Daar heb je een soort canvas ala grasshopper met nodes en wires etc

537. verbind de graph aan het FEM model

538. Op hoeveel regels code zit je nu

539. De schaal van de q-last, Momenten lijn, dwarskrachtenlijn en normaal krachten lijnen moet op basis van 1 waarde

540. Dus niet relatief per staaf

541. De grootste waarde bepaalde de schaal voor de rest

542. Bij een staaf wil ik het begin en eind als 'hinge' in kunnen stellen met een knop. Maar daarna moet dat ook in het FEM-model aangepast worden zodat er geen moment op die plek overgedragen kan worden

543. Verbeter de tekeningweergave in de rapporten

544. Zorg dat alles er net zo netjs uit ziet als i in het canvas

545. Belastingen met pijlen, puntlasten, verplaatsingslijnen

546. De preview van de report is een rommel

547. Kijk opniuew naar de previw section

548. Het rapport is wel beter, maar vanaf ca pagina 3 gaat het weer fout

549. Het symbool voor oplegging is toch wat minder mooi

550. Maak deze beter na op basis van hoe je hem ziet in het canvas

551. Onder 3D zit een 3D view met IfcOpenShell

552. Ik wil dat je op basis vna het rekenmodel en het profiel een 3D model maakt met Beams

553. ZOrg ervoor dat de profielen kloppen

554. Bijvoorbeeld I-shape parallel flanges en andere staalvormen zijn parametrisch beschikbaar in ifc

555. Die wil ik gebruiken

556. Ga in plan mode want dit is best wel een ding

557. Ik wil de bij de ribbon in 3D die teksten weghebben

558. run it to test the 3D view

559. Maak een functie voor het berekenen van de oppervlakte, statisch moment, traagheidsmoment, weerstandmoment van een doorsnede op basis van een contour van lijnen

560. Ik wil die gaan gebruiken om doorsnede-eigenschappen van staalprofielen te berekenen van allerlei vormen

561. Haal hier inspiratie uit: https://github.com/robbievanleeuwen/section-properties

562. height / 2 + tf - math.tan(self.sa) * (tl - r2), ) # end arc p6 = Point(

563. ex + tw + r1 - math.sin(self.sa) * r1

564. height / 2 + tf + math.tan(self.sa) * (width - tl - tw - r1), ) # start arc p7 = Point(

565. ex + tw + r1 - r11

566. height / 2 + tf + math.tan(self.sa) * (width - tl - tw - r1) + r1 - r11, ) # second point arc p8 = Point(

567. ex + tw, -height / 2 + tf + math.tan(self.sa) * (width - tl - tw) + r1 ) # end arc p9 = Point(p8.x, -p8.y) # start arc p10 = Point(p7.x, -p7.y) # second point arc p11 = Point(p6.x, -p6.y) # end arc p12 = Point(p5.x, -p5.y) # start arc p13 = Point(p4.x, -p4.y) # second point arc p14 = Point(p3.x, -p3.y) # end arc p15 = Point(p2.x, -p2.y) # right top p16 = Point(p1.x, -p1.y) # left top # describe curves l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Arc.by_start_mid_end(p3, p4, p5) l4 = Line(p5, p6) l5 = Arc.by_start_mid_end(p6, p7, p8) l6 = Line(p8, p9) l7 = Arc.by_start_mid_end(p9, p10, p11) l8 = Line(p11, p12) l9 = Arc.by_start_mid_end(p12, p13, p14) l10 = Line(p14, p15) l11 = Line(p15, p16) l12 = Line(p16, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12]) class IShapeParallelFlangeProfile(Profile): def __init__(self, name, height, width, tw, tf, r): super().__init__( name, "I Shape profile with parallel flange", "IfcUShapeProfileDef", height, width, tw, tf, ) self.r = r # web fillet self.r1 = r1 = r / sqrt2 # describe points p1 = Point(width / 2, -height / 2) # right bottom p2 = Point(width / 2, -height / 2 + tf) p3 = Point(tw / 2 + r, -height / 2 + tf) # start arc # second point arc p4 = Point(tw / 2 + r - r1, (-height / 2 + tf + r - r1)) p5 = Point(tw / 2, -height / 2 + tf + r) # end arc p6 = Point(tw / 2, height / 2 - tf - r) # start arc p7 = Point(tw / 2 + r - r1, height / 2 - tf - r + r1) # second point arc p8 = Point(tw / 2 + r, height / 2 - tf) # end arc p9 = Point(width / 2, height / 2 - tf) p10 = Point((width / 2), (height / 2)) # right top p11 = Point(-p10.x, p10.y) # left top p12 = Point(-p9.x, p9.y) p13 = Point(-p8.x, p8.y) # start arc p14 = Point(-p7.x, p7.y) # second point arc p15 = Point(-p6.x, p6.y) # end arc p16 = Point(-p5.x, p5.y) # start arc p17 = Point(-p4.x, p4.y) # second point arc p18 = Point(-p3.x, p3.y) # end arc p19 = Point(-p2.x, p2.y) p20 = Point(-p1.x, p1.y) # describe curves l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Arc.by_start_mid_end(p3, p4, p5) l4 = Line(p5, p6) l5 = Arc.by_start_mid_end(p6, p7, p8) l6 = Line(p8, p9) l7 = Line(p9, p10) l8 = Line(p10, p11) l9 = Line(p11, p12) l10 = Line(p12, p13) l11 = Arc.by_start_mid_end(p13, p14, p15) l12 = Line(p15, p16) l13 = Arc.by_start_mid_end(p16, p17, p18) l14 = Line(p18, p19) l15 = Line(p19, p20) l16 = Line(p20, p1) self.curve = PolyCurve( [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16] ) class RectangleProfile(Profile): def __init__(self, name, width, height): super().__init__(name, "Rectangle", "IfcRectangleProfileDef", height, width) # describe points p1 = Point(width / 2, -height / 2) # right bottom p2 = Point(width / 2, height / 2) # right top p3 = Point(-width / 2, height / 2) # left top p4 = Point(-width / 2, -height / 2) # left bottom # describe curves l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Line(p3, p4) l4 = Line(p4, p1) self.curve = PolyCurve([l1, l2, l3, l4]) class RoundProfile(Profile): def __init__(self, name, r): super().__init__(name, "Round", "IfcCircleProfileDef", r * 2, r * 2) self.r = r dr = r / sqrt2 # grootste deel # describe points p1 = Point(r, 0) # right middle p2 = Point(dr, dr) p3 = Point(0, r) # middle top p4 = Point(-dr, dr) p5 = Point(-r, 0) # left middle p6 = Point(-dr, -dr) p7 = Point(0, -r) # middle bottom p8 = Point(dr, -dr) # describe curves l1 = Arc.by_start_mid_end(p1, p2, p3) l2 = Arc.by_start_mid_end(p3, p4, p5) l3 = Arc.by_start_mid_end(p5, p6, p7) l4 = Arc.by_start_mid_end(p7, p8, p1) self.curve = PolyCurve([l1, l2, l3, l4]) class RoundtubeProfile(Profile): def __init__(self, name, d, t): super().__init__(name, "Round Tube Profile", "IfcCircleHollowProfileDef", d, d) # parameters self.r = d / 2 self.d = d self.t = t # wall thickness dr = self.r / sqrt2 # grootste deel r = self.r ri = r - t dri = ri / sqrt2 # describe points p1 = Point(r, 0) # right middle p2 = Point(dr, dr) p3 = Point(0, r) # middle top p4 = Point(-dr, dr) p5 = Point(-r, 0) # left middle p6 = Point(-dr, -dr) p7 = Point(0, -r) # middle bottom p8 = Point(dr, -dr) p9 = Point(ri, 0) # right middle inner p10 = Point(dri, dri) p11 = Point(0, ri) # middle top inner p12 = Point(-dri, dri) p13 = Point(-ri, 0) # left middle inner p14 = Point(-dri, -dri) p15 = Point(0, -ri) # middle bottom inner p16 = Point(dri, -dri) # describe curves l1 = Arc.by_start_mid_end(p1, p2, p3) l2 = Arc.by_start_mid_end(p3, p4, p5) l3 = Arc.by_start_mid_end(p5, p6, p7) l4 = Arc.by_start_mid_end(p7, p8, p1) l5 = Line(p1, p9) l6 = Arc.by_start_mid_end(p9, p10, p11) l7 = Arc.by_start_mid_end(p11, p12, p13) l8 = Arc.by_start_mid_end(p13, p14, p15) l9 = Arc.by_start_mid_end(p15, p16, p9) l10 = Line(p9, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6, l7, l8, l9, l10]) class LAngleProfile(Profile): def __init__(self, name, height, width, tw, tf, r1, r2, ex, ey): super().__init__(name, "LAngle", "IfcLShapeProfileDef", height, width, tw, tf) # parameters self.r1 = r1 # inner fillet r11 = r1 / sqrt2 self.r2 = r2 # outer fillet r21 = r2 / sqrt2 self.ex = ex # from left self.ey = ey # from bottom # describe points p1 = Point(-ex, -ey) # left bottom p2 = Point(width - ex, -ey) # right bottom p3 = Point(width - ex, -ey + tf - r2) # start arc p4 = Point(width - ex - r2 + r21, -ey + tf - r2 + r21) # second point arc p5 = Point(width - ex - r2, -ey + tf) # end arc p6 = Point(-ex + tf + r1, -ey + tf) # start arc p7 = Point(-ex + tf + r1 - r11, -ey + tf + r1 - r11) # second point arc p8 = Point(-ex + tf, -ey + tf + r1) # end arc p9 = Point(-ex + tf, height - ey - r2) # start arc p10 = Point(-ex + tf - r2 + r21, height - ey - r2 + r21) # second point arc p11 = Point(-ex + tf - r2, height - ey) # end arc p12 = Point(-ex, height - ey) # left top # describe curves l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Arc.by_start_mid_end(p3, p4, p5) l4 = Line(p5, p6) l5 = Arc.by_start_mid_end(p6, p7, p8) l6 = Line(p8, p9) l7 = Arc.by_start_mid_end(p9, p10, p11) l8 = Line(p11, p12) l9 = Line(p12, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6, l7, l8, l9]) class TProfileRounded(Profile): # ToDo: inner outer fillets in polycurve def __init__(self, name, height, width, tw, tf, r, r1, r2, ex, ey): super().__init__(name, "TProfile", "IfcTShapeProfileDef", height, width, tw, tf) self.r = r # inner fillet self.r01 = r / sqrt2 self.r1 = r1 # outer fillet flange r11 = r1 / sqrt2 self.r2 = r2 # outer fillet top web r21 = r2 / sqrt2 self.ex = ex # from left self.ey = ey # from bottom # describe points p1 = Point(-ex, -ey) # left bottom p2 = Point(width - ex, -ey) # right bottom p3 = Point(width - ex, -ey + tf - r1) # start arc p4 = Point(width - ex - r1 + r11, -ey + tf - r1 + r11) # second point arc p5 = Point(width - ex - r1, -ey + tf) # end arc p6 = Point(0.5 * tw + r, -ey + tf) # start arc p7 = Point(0.5 * tw + r - self.r01, -ey + tf + r - self.r01) # second point arc p8 = Point(0.5 * tw, -ey + tf + r) # end arc p9 = Point(0.5 * tw, -ey + height - r2) # start arc p10 = Point(0.5 * tw - r21, -ey + height - r2 + r21) # second point arc p11 = Point(0.5 * tw - r2, -ey + height) # end arc p12 = Point(-p11.x, p11.y) p13 = Point(-p10.x, p10.y) p14 = Point(-p9.x, p9.y) p15 = Point(-p8.x, p8.y) p16 = Point(-p7.x, p7.y) p17 = Point(-p6.x, p6.y) p18 = Point(-p5.x, p5.y) p19 = Point(-p4.x, p4.y) p20 = Point(-p3.x, p3.y) # describe curves l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Arc.by_start_mid_end(p3, p4, p5) l4 = Line(p5, p6) l5 = Arc.by_start_mid_end(p6, p7, p8) l6 = Line(p8, p9) l7 = Arc.by_start_mid_end(p9, p10, p11) l8 = Line(p11, p12) l9 = Arc.by_start_mid_end(p12, p13, p14) l10 = Line(p14, p15) l11 = Arc.by_start_mid_end(p15, p16, p17) l12 = Line(p17, p18) l13 = Arc.by_start_mid_end(p18, p19, p20) l14 = Line(p20, p1) self.curve = PolyCurve( [l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14] ) class RectangleHollowSectionProfile(Profile): def __init__(self, name, height, width, t, r1, r2): super().__init__( name, "Rectangle Hollow Section", "IfcRectangleHollowProfileDef", height, width, tw=t, tf=t, ) # parameters self.t = t # thickness self.r1 = r1 # outer radius self.r2 = r2 # inner radius dr = r1 - r1 / sqrt2 dri = r2 - r2 / sqrt2 bi = width - t hi = height - t # describe points p1 = Point(-width / 2 + r1, -height / 2) # left bottom end arc p2 = Point(width / 2 - r1, -height / 2) # right bottom start arc p3 = Point(width / 2 - dr, -height / 2 + dr) # right bottom mid arc p4 = Point(width / 2, -height / 2 + r1) # right bottom end arc p5 = Point(p4.x, -p4.y) # right start arc p6 = Point(p3.x, -p3.y) # right mid arc p7 = Point(p2.x, -p2.y) # right end arc p8 = Point(-p7.x, p7.y) # left start arc p9 = Point(-p6.x, p6.y) # left mid arc p10 = Point(-p5.x, p5.y) # left end arc p11 = Point(p10.x, -p10.y) # right bottom start arc p12 = Point(p9.x, -p9.y) # right bottom mid arc # inner part p13 = Point(-bi / 2 + r2, -hi / 2) # left bottom end arc p14 = Point(bi / 2 - r2, -hi / 2) # right bottom start arc p15 = Point(bi / 2 - dri, -hi / 2 + dri) # right bottom mid arc p16 = Point(bi / 2, -hi / 2 + r2) # right bottom end arc p17 = Point(p16.x, -p16.y) # right start arc p18 = Point(p15.x, -p15.y) # right mid arc p19 = Point(p14.x, -p14.y) # right end arc p20 = Point(-p19.x, p19.y) # left start arc p21 = Point(-p18.x, p18.y) # left mid arc p22 = Point(-p17.x, p17.y) # left end arc p23 = Point(p22.x, -p22.y) # right bottom start arc p24 = Point(p21.x, -p21.y) # right bottom mid arc # describe outer curves l1 = Line(p1, p2) l2 = Arc.by_start_mid_end(p2, p3, p4) l3 = Line(p4, p5) l4 = Arc.by_start_mid_end(p5, p6, p7) l5 = Line(p7, p8) l6 = Arc.by_start_mid_end(p8, p9, p10) l7 = Line(p10, p11) l8 = Arc.by_start_mid_end(p11, p12, p1) l9 = Line(p1, p13) # describe inner curves l10 = Line(p13, p14) l11 = Arc.by_start_mid_end(p14, p15, p16) l12 = Line(p16, p17) l13 = Arc.by_start_mid_end(p17, p18, p19) l14 = Line(p19, p20) l15 = Arc.by_start_mid_end(p20, p21, p22) l16 = Line(p22, p23) l17 = Arc.by_start_mid_end(p23, p24, p13) l18 = Line(p13, p1) self.curve = PolyCurve( [ l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, ] ) class CProfile(Profile): def __init__(self, name, width, height, t, r1, ex): super().__init__( name, "Cold Formed C Profile", "Unknown", height, width, tw=t, tf=t ) # parameters self.t = t # flange thickness self.r1 = r1 # outer radius self.r2 = r1 - t # inner radius r2 = r1 - t self.ex = ex self.ey = height / 2 dr = r1 - r1 / sqrt2 dri = r2 - r2 / sqrt2 hi = height - t # describe points p1 = Point(width - ex, -height / 2) # right bottom p2 = Point(r1 - ex, -height / 2) p3 = Point(dr - ex, -height / 2 + dr) p4 = Point(0 - ex, -height / 2 + r1) p5 = Point(p4.x, -p4.y) p6 = Point(p3.x, -p3.y) p7 = Point(p2.x, -p2.y) p8 = Point(p1.x, -p1.y) # right top p9 = Point(width - ex, hi / 2) # right top inner p10 = Point(t + r2 - ex, hi / 2) p11 = Point(t + dri - ex, hi / 2 - dri) p12 = Point(t - ex, hi / 2 - r2) p13 = Point(p12.x, -p12.y) p14 = Point(p11.x, -p11.y) p15 = Point(p10.x, -p10.y) p16 = Point(p9.x, -p9.y) # right bottom inner # describe outer curves l1 = Line(p1, p2) # bottom l2 = Arc.by_start_mid_end(p2, p3, p4) # right outer fillet l3 = Line(p4, p5) # left outer web l4 = Arc.by_start_mid_end(p5, p6, p7) # left top outer fillet l5 = Line(p7, p8) # outer top l6 = Line(p8, p9) l7 = Line(p9, p10) l8 = Arc.by_start_mid_end(p10, p11, p12) # left top inner fillet l9 = Line(p12, p13) l10 = Arc.by_start_mid_end(p13, p14, p15) # left botom inner fillet l11 = Line(p15, p16) l12 = Line(p16, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12]) class CProfileWithLips(Profile): def __init__(self, name, width, height, h1, t, r1, ex): super().__init__( name, "Cold Formed C Profile with Lips", "Unknown", height, width, tw=t, tf=t, ) # parameters self.h1 = h1 # lip length self.t = t # flange thickness self.r1 = r1 # outer radius self.r2 = r1 - t # inner radius r2 = r1 - t self.ex = ex self.ey = height / 2 dr = r1 - r1 / sqrt2 dri = r2 - r2 / sqrt2 hi = height - t # describe points p1 = Point(width - ex - r1, -height / 2) # right bottom before fillet p2 = Point(r1 - ex, -height / 2) p3 = Point(dr - ex, -height / 2 + dr) p4 = Point(0 - ex, -height / 2 + r1) p5 = Point(p4.x, -p4.y) p6 = Point(p3.x, -p3.y) p7 = Point(p2.x, -p2.y) p8 = Point(p1.x, -p1.y) # right top before fillet p9 = Point(width - ex - dr, height / 2 - dr) # middle point arc p10 = Point(width - ex, height / 2 - r1) # end fillet p11 = Point(width - ex, height / 2 - h1) p12 = Point(width - ex - t, height / 2 - h1) # bottom lip p13 = Point(width - ex - t, height / 2 - t - r2) # start inner fillet right top p14 = Point(width - ex - t - dri, height / 2 - t - dri) p15 = Point(width - ex - t - r2, height / 2 - t) # end inner fillet right top p16 = Point(0 - ex + t + r2, height / 2 - t) p17 = Point(0 - ex + t + dri, height / 2 - t - dri) p18 = Point(0 - ex + t, height / 2 - t - r2) p19 = Point(p18.x, -p18.y) p20 = Point(p17.x, -p17.y) p21 = Point(p16.x, -p16.y) p22 = Point(p15.x, -p15.y) p23 = Point(p14.x, -p14.y) p24 = Point(p13.x, -p13.y) p25 = Point(p12.x, -p12.y) p26 = Point(p11.x, -p11.y) p27 = Point(p10.x, -p10.y) p28 = Point(p9.x, -p9.y) # describe outer curves l1 = Line(p1, p2) l2 = Arc.by_start_mid_end(p2, p3, p4) l3 = Line(p4, p5) l4 = Arc.by_start_mid_end(p5, p6, p7) # outer fillet right top l5 = Line(p7, p8) l6 = Arc.by_start_mid_end(p8, p9, p10) l7 = Line(p10, p11) l8 = Line(p11, p12) l9 = Line(p12, p13) l10 = Arc.by_start_mid_end(p13, p14, p15) l11 = Line(p15, p16) l12 = Arc.by_start_mid_end(p16, p17, p18) l13 = Line(p18, p19) # inner web l14 = Arc.by_start_mid_end(p19, p20, p21) l15 = Line(p21, p22) l16 = Arc.by_start_mid_end(p22, p23, p24) l17 = Line(p24, p25) l18 = Line(p25, p26) l19 = Line(p26, p27) l20 = Arc.by_start_mid_end(p27, p28, p1) self.curve = PolyCurve( [ l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19, l20, ] ) class LProfileColdFormed(Profile): def __init__(self, name, width, height, t, r1, ex, ey): super().__init__( name, "Cold Formed L Profile", "Unknown", height, width, tw=t, tf=t ) # parameters self.t = t # flange thickness self.r1 = r1 # inner radius self.r2 = r1 - t # outer radius self.ex = ex self.ey = ey r11 = r1 / math.sqrt(2) r2 = r1 + t r21 = r2 / math.sqrt(2) # describe points p1 = Point(-ex, -ey + r2) # start arc left bottom p2 = Point(-ex + r2 - r21, -ey + r2 - r21) # second point arc p3 = Point(-ex + r2, -ey) # end arc p4 = Point(width - ex, -ey) # right bottom p5 = Point(width - ex, -ey + t) p6 = Point(-ex + t + r1, -ey + t) # start arc p7 = Point(-ex + t + r1 - r11, -ey + t + r1 - r11) # second point arc p8 = Point(-ex + t, -ey + t + r1) # end arc p9 = Point(-ex + t, ey) p10 = Point(-ex, ey) # left top l1 = Arc.by_start_mid_end(p1, p2, p3) l2 = Line(p3, p4) l3 = Line(p4, p5) l4 = Line(p5, p6) l5 = Arc.by_start_mid_end(p6, p7, p8) l6 = Line(p8, p9) l7 = Line(p9, p10) l8 = Line(p10, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6, l7, l8]) class SigmaProfileWithLipsColdFormed(Profile): def __init__(self, name, width, height, t, r1, h1, h2, h3, b2, ex): super().__init__( name, "Cold Formed Sigma Profile with Lips", "Unknown", height, width, tw=t, tf=t, ) # parameters self.h1 = h1 # LipLength self.h2 = h2 # MiddleBendLength self.h3 = h3 # TopBendLength self.h4 = h4 = (height - h2 - h3 * 2) / 2 self.h5 = h5 = math.tan(0.5 * math.atan(b2 / h4)) * t self.b2 = b2 # MiddleBendWidth self.t = t # flange thickness self.r1 = r1 # inner radius self.r2 = r2 = r1 + t # outer radius self.ex = ex self.ey = ey = height / 2 r11 = r11 = r1 / math.sqrt(2) r21 = r21 = r2 / math.sqrt(2) p1 = Point(-ex + b2, -h2 / 2) p2 = Point(-ex, -ey + h3) p3 = Point(-ex, -ey + r2) # start arc left bottom p4 = Point(-ex + r2 - r21, -ey + r2 - r21) # second point arc p5 = Point(-ex + r2, -ey) # end arc p6 = Point(width - ex - r2, -ey) # start arc p7 = Point(width - ex - r2 + r21, -ey + r2 - r21) # second point arc p8 = Point(width - ex, -ey + r2) # end arc p9 = Point(width - ex, -ey + h1) # end lip p10 = Point(width - ex - t, -ey + h1) p11 = Point(width - ex - t, -ey + t + r1) # start arc p12 = Point(width - ex - t - r1 + r11, -ey + t + r1 - r11) # second point arc p13 = Point(width - ex - t - r1, -ey + t) # end arc p14 = Point(-ex + t + r1, -ey + t) # start arc p15 = Point(-ex + t + r1 - r11, -ey + t + r1 - r11) # second point arc p16 = Point(-ex + t, -ey + t + r1) # end arc p17 = Point(-ex + t, -ey + h3 - h5) p18 = Point(-ex + b2 + t, -h2 / 2 - h5) p19 = Point(p18.x, -p18.y) p20 = Point(p17.x, -p17.y) p21 = Point(p16.x, -p16.y) p22 = Point(p15.x, -p15.y) p23 = Point(p14.x, -p14.y) p24 = Point(p13.x, -p13.y) p25 = Point(p12.x, -p12.y) p26 = Point(p11.x, -p11.y) p27 = Point(p10.x, -p10.y) p28 = Point(p9.x, -p9.y) p29 = Point(p8.x, -p8.y) p30 = Point(p7.x, -p7.y) p31 = Point(p6.x, -p6.y) p32 = Point(p5.x, -p5.y) p33 = Point(p4.x, -p4.y) p34 = Point(p3.x, -p3.y) p35 = Point(p2.x, -p2.y) p36 = Point(p1.x, -p1.y) l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Arc.by_start_mid_end(p3, p4, p5) l4 = Line(p5, p6) l5 = Arc.by_start_mid_end(p6, p7, p8) l6 = Line(p8, p9) l7 = Line(p9, p10) l8 = Line(p10, p11) l9 = Arc.by_start_mid_end(p11, p12, p13) l10 = Line(p13, p14) l11 = Arc.by_start_mid_end(p14, p15, p16) l12 = Line(p16, p17) l13 = Line(p17, p18) l14 = Line(p18, p19) l15 = Line(p19, p20) l16 = Line(p20, p21) l17 = Arc.by_start_mid_end(p21, p22, p23) l18 = Line(p23, p24) l19 = Arc.by_start_mid_end(p24, p25, p26) l20 = Line(p26, p27) l21 = Line(p27, p28) l22 = Line(p28, p29) l23 = Arc.by_start_mid_end(p29, p30, p31) l24 = Line(p31, p32) l25 = Arc.by_start_mid_end(p32, p33, p34) l26 = Line(p34, p35) l27 = Line(p35, p36) l28 = Line(p36, p1) self.curve = PolyCurve( [ l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19, l20, l21, l22, l23, l24, l25, l26, l27, l28, ] ) class ZProfileColdFormed(Profile): def __init__(self, name, width, height, t, r1): super().__init__( name, "Cold Formed Z Profile", "Unknown", height, width, tw=t, tf=t ) # parameters self.t = t # flange thickness self.r1 = r1 # inner radius self.r2 = r2 = r1 + t # outer radius self.ex = ex = width / 2 self.ey = ey = height / 2 r11 = r11 = r1 / math.sqrt(2) r21 = r21 = r2 / math.sqrt(2) p1 = Point(-0.5 * t, -ey + t + r1) # start arc p2 = Point(-0.5 * t - r1 + r11, -ey + t + r1 - r11) # second point arc p3 = Point(-0.5 * t - r1, -ey + t) # end arc p4 = Point(-ex, -ey + t) p5 = Point(-ex, -ey) # left bottom p6 = Point(-r2 + 0.5 * t, -ey) # start arc p7 = Point(-r2 + 0.5 * t + r21, -ey + r2 - r21) # second point arc p8 = Point(0.5 * t, -ey + r2) # end arc p9 = Point(-p1.x, -p1.y) p10 = Point(-p2.x, -p2.y) p11 = Point(-p3.x, -p3.y) p12 = Point(-p4.x, -p4.y) p13 = Point(-p5.x, -p5.y) p14 = Point(-p6.x, -p6.y) p15 = Point(-p7.x, -p7.y) p16 = Point(-p8.x, -p8.y) l1 = Arc.by_start_mid_end(p1, p2, p3) l2 = Line(p3, p4) l3 = Line(p4, p5) l4 = Line(p5, p6) l5 = Arc.by_start_mid_end(p6, p7, p8) l6 = Line(p8, p9) l7 = Arc.by_start_mid_end(p9, p10, p11) l8 = Line(p11, p12) l9 = Line(p12, p13) l10 = Line(p13, p14) l11 = Arc.by_start_mid_end(p14, p15, p16) l12 = Line(p16, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12]) class ZProfileWithLipsColdFormed(Profile): def __init__(self, name, width, height, t, r1, h1): super().__init__( name, "Cold Formed Z Profile with Lips", "Unknown", height, width, tw=t, tf=t, ) # parameters self.t = t # flange thickness self.h1 = h1 # lip length self.r1 = r1 # inner radius self.r2 = r2 = r1 + t # outer radius self.ex = ex = width / 2 self.ey = ey = height / 2 r11 = r11 = r1 / math.sqrt(2) r21 = r21 = r2 / math.sqrt(2) p1 = Point(-0.5 * t, -ey + t + r1) # start arc p2 = Point(-0.5 * t - r1 + r11, -ey + t + r1 - r11) # second point arc p3 = Point(-0.5 * t - r1, -ey + t) # end arc p4 = Point(-ex + t + r1, -ey + t) # start arc p5 = Point(-ex + t + r1 - r11, -ey + t + r1 - r11) # second point arc p6 = Point(-ex + t, -ey + t + r1) # end arc p7 = Point(-ex + t, -ey + h1) p8 = Point(-ex, -ey + h1) p9 = Point(-ex, -ey + r2) # start arc p10 = Point(-ex + r2 - r21, -ey + r2 - r21) # second point arc p11 = Point(-ex + r2, -ey) # end arc p12 = Point(-r2 + 0.5 * t, -ey) # start arc p13 = Point(-r2 + 0.5 * t + r21, -ey + r2 - r21) # second point arc p14 = Point(0.5 * t, -ey + r2) # end arc p15 = Point(-p1.x, -p1.y) p16 = Point(-p2.x, -p2.y) p17 = Point(-p3.x, -p3.y) p18 = Point(-p4.x, -p4.y) p19 = Point(-p5.x, -p5.y) p20 = Point(-p6.x, -p6.y) p21 = Point(-p7.x, -p7.y) p22 = Point(-p8.x, -p8.y) p23 = Point(-p9.x, -p9.y) p24 = Point(-p10.x, -p10.y) p25 = Point(-p11.x, -p11.y) p26 = Point(-p12.x, -p12.y) p27 = Point(-p13.x, -p13.y) p28 = Point(-p14.x, -p14.y) l1 = Arc.by_start_mid_end(p1, p2, p3) l2 = Line(p3, p4) l3 = Arc.by_start_mid_end(p4, p5, p6) l4 = Line(p6, p7) l5 = Line(p7, p8) l6 = Line(p8, p9) l7 = Arc.by_start_mid_end(p9, p10, p11) l8 = Line(p11, p12) l9 = Arc.by_start_mid_end(p12, p13, p14) l10 = Line(p14, p15) l11 = Arc.by_start_mid_end(p15, p16, p17) l12 = Line(p17, p18) l13 = Arc.by_start_mid_end(p18, p19, p20) l14 = Line(p20, p21) l15 = Line(p21, p22) l16 = Line(p22, p23) l17 = Arc.by_start_mid_end(p23, p24, p25) l18 = Line(p25, p26) l19 = Arc.by_start_mid_end(p26, p27, p28) l20 = Line(p28, p1) self.curve = PolyCurve( [ l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19, l20, ] ) class TProfile(Profile): def __init__(self, name, height, width, h1: float, b1: float): super().__init__(name, "T-profile", "Unknown", height, width) # parameters self.h1 = h1 self.b1 = b1 # describe points p1 = Point(b1 / 2, -height / 2) # right bottom p2 = Point(b1 / 2, height / 2 - h1) # right middle 1 p3 = Point(width / 2, height / 2 - h1) # right middle 2 p4 = Point(width / 2, height / 2) # right top p5 = Point(-width / 2, height / 2) # left top p6 = Point(-width / 2, height / 2 - h1) # left middle 2 p7 = Point(-b1 / 2, height / 2 - h1) # left middle 1 p8 = Point(-b1 / 2, -height / 2) # left bottom # describe curves l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Line(p3, p4) l4 = Line(p4, p5) l5 = Line(p5, p6) l6 = Line(p6, p7) l7 = Line(p7, p8) l8 = Line(p8, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6, l7, l8]) class LProfile(Profile): def __init__(self, name, height, width, h1: float, b1: float): super().__init__(name, "L-profile", "Unknown", height, width) # parameters self.h1 = h1 self.b1 = b1 # describe points p1 = Point(width / 2, -height / 2) # right bottom p2 = Point(width / 2, -height / 2 + h1) # right middle p3 = Point(-width / 2 + b1, -height / 2 + h1) # middle p4 = Point(-width / 2 + b1, height / 2) # middle top p5 = Point(-width / 2, height / 2) # left top p6 = Point(-width / 2, -height / 2) # left bottom # describe curves l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Line(p3, p4) l4 = Line(p4, p5) l5 = Line(p5, p6) l6 = Line(p6, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6]) class EProfile(Serializable): def __init__(self, name, height, width, h1): super().__init__(name, "E-profile", "Unknown", height, width) # parameters self.h1 = h1 # describe points p1 = Point(width / 2, -height / 2) # right bottom p2 = Point(width / 2, -height / 2 + h1) p3 = Point(-width / 2 + h1, -height / 2 + h1) p4 = Point(-width / 2 + h1, -h1 / 2) p5 = Point(width / 2, -h1 / 2) p6 = Point(width / 2, h1 / 2) p7 = Point(-width / 2 + h1, h1 / 2) p8 = Point(-width / 2 + h1, height / 2 - h1) p9 = Point(width / 2, height / 2 - h1) p10 = Point(width / 2, height / 2) p11 = Point(-width / 2, height / 2) p12 = Point(-width / 2, -height / 2) # describe curves l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Line(p3, p4) l4 = Line(p4, p5) l5 = Line(p5, p6) l6 = Line(p6, p7) l7 = Line(p7, p8) l8 = Line(p8, p9) l9 = Line(p9, p10) l10 = Line(p10, p11) l11 = Line(p11, p12) l12 = Line(p12, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12]) class NProfile(Serializable): def __init__(self, name, height, width, b1): super().__init__(name, "N-profile", "Unknown", height, width) # parameters self.b1 = b1 # describe points p1 = Point(width / 2, -height / 2) # right bottom p2 = Point(width / 2, height / 2) p3 = Point(width / 2 - b1, height / 2) p4 = Point(width / 2 - b1, -height / 2 + b1 * 2) p5 = Point(-width / 2 + b1, height / 2) p6 = Point(-width / 2, height / 2) p7 = Point(-width / 2, -height / 2) p8 = Point(-width / 2 + b1, -height / 2) p9 = Point(-width / 2 + b1, height / 2 - b1 * 2) p10 = Point(width / 2 - b1, -height / 2) # describe curves l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Line(p3, p4) l4 = Line(p4, p5) l5 = Line(p5, p6) l6 = Line(p6, p7) l7 = Line(p7, p8) l8 = Line(p8, p9) l9 = Line(p9, p10) l10 = Line(p10, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6, l7, l8, l9, l10]) class ArrowProfile(Profile): def __init__(self, name, length, width, b1, l1): super().__init__(name, "Arrow-profile", "Unknown", length, width) # parameters self.length = length # length self.b1 = b1 self.l1 = l1 # describe points p1 = Point(0, length / 2) # top middle p2 = Point(width / 2, -length / 2 + l1) # p3 = Point(b1 / 2, -length / 2 + l1) p3 = Point(b1 / 2, (-length / 2 + l1) + (length / 2) / 4) p4 = Point(b1 / 2, -length / 2) p5 = Point(-b1 / 2, -length / 2) # p6 = Point(-b1 / 2, -length / 2 + l1) p6 = Point(-b1 / 2, (-length / 2 + l1) + (length / 2) / 4) p7 = Point(-width / 2, -length / 2 + l1) # describe curves l1 = Line(p1, p2) l2 = Line(p2, p3) l3 = Line(p3, p4) l4 = Line(p4, p5) l5 = Line(p5, p6) l6 = Line(p6, p7) l7 = Line(p7, p1) self.curve = PolyCurve([l1, l2, l3, l4, l5, l6, l7])

568. /home/maarten/Documents/GitHub/Project-Ocondat/steelprofile.json

569. Ik wil graag al die staalprofielen hier in laden

570. En ook de IfcProfile koppelen

571. Ik in de previw bij Section Profile nog geen verbetering

572. run it en laat me de dialog zien

573. A van een profiel in mm2 Iy, Iz in mm4 Wy in mm3 Gebruik subscript en superscript in de weergave

574. Laat de neutrale lijn zien in beide richtingen

575. Profile rotation aan kunnen zetten

576. De symbolen op de ribbon mogen wat dicher op elkaar of wat groter worden

577. Uitdraai Reaction Forces

578. Teken deze opnieuw op basis van de canvas

579. Pijlen moet op andere positie

580. Betreft de afbeeldingen in het report

581. Ik wil toch wel de canvas weergave gebruiken

582. Je kunt dan namelijk ook nog per tekening zaken aan/uit zetten

583. ja, doe maar

584. section scherm opent niet

585. Bij Bar Properties hoe ik niet alle eigenschappen van de sectio te zien. Naam, A en Iy is voldoende. Laat Rx, Rz, Tx, Tz start en end. Maak dropdown per vrijheidsgraad: ' ' free - no limitation 'A' Fully limited (Absolute) 'P' Limited for a Positive reaction force

586. free for a negative reaction force 'N' Limited for a Negative reaction force

587. free for a positive reaction force 'S' Springer (Spring)

588. spring value needs to be inserted


## 2026-02-05

589. Ik wil dat de constraints options meegenomen worden in het EEM model

590. Ik wil bij de start en het eind een dropdown menu met de volgende opties: 'Fully Fixed', 'Hinge', 'Tension only' 'Pressure only' Die wijzigen de constraints

591. Ik wil ook in het canvas per staafaansluiting dat zichtbaar hebben

592. Bij Fully Fixed blijft het zoals het nu is

593. Als het hinged is zie je een kleine ronde bol aan het eind (of begin) van de staaf

594. Bij tension een + en bij rotation spring een soort 'veer'

595. Welk UI framework heb je hier nu gebruikt?

596. Ik zie nog niet dat de constraints zichtbaar worden in het canvas

597. En het heeft ook nog geen effect op de krachtsverdeling

598. Er worden nog steeds momenten overdragen bij knoop 2 terwijl de rechterstaaf 'hinged' aansluit

599. Generic: Dit zijn materialen als staal, hout, beton, aluminium zonder dat specifiek in een normenserie zit

600. Eurocode NL: Dit zijn de materialen zoals wij ze in Nederland gewent zijn: Staal (S235, S275 etc.) Hout: C18, C24 Beton C20/25 etc. Alle relevante eigenschappen van de materiae Sla al deze materiaalinformatie alvast op in je code in een aparte bibliotheek. Ook als je er nu nog niets mee doet. Ik wil het materialenscherm alvast Beton, Hout, Staal zien. TABEL 3.1 t<40 mm t 40 –80 mm fy fu fy fu rek βw EN [N/mm2] [N/mm2] [N/mm2] [N/mm2] [%]

601. ?? BETONSTAAL oude benaming Vloeigrens B220 Feb220

602. [N/mm2] B400 Feb400

603. [N/mm2] B500 FeB500

604. [N/mm2] BOUTKWALITEITEN

605. [N/mm2] ft

606. [N/mm2] Sterkteklassen voor gezaagd populieren en naaldhout Grootheid Symbool C14 C16 C18 C20 C22 C24 C27 C30 C35 buigsterkte fm

607. volumieke massa ρk

608. treksterkte(evenw) ft

609. treksterkte(loodr) ft

610. druksterkte(evenw) fc

611. druksterke(loodr) fc

612. schuifsterkte fv

613. E-modulus in UGT E0

614. E-modulus in BGT E0

615. E-moludus (loodr) E90

616. afschuivingsmod Gmean

617. Sterkteklassen voor gezaagd hout Grootheid Symbool D30 D35 D40 D50 D60 D70 buigsterkte fm

618. volumieke massa ρk

619. treksterkte(evenw) ft

620. treksterkte(loodr) ft

621. druksterkte(evenw) fc

622. druksterke(loodr) fc

623. schuifsterkte fv

624. E-modulus in UGT E0

625. E-modulus in BGT E0

626. E-moludus (loodr) E90

627. afschuivingsmod Gmean

628. Sterkteklassen voor gelamineerd hout Eigenschap GL 24h GL 28h GL 32h GL 36h fgl

629. kmod, voor gelamineerd en gezaagt hout behoudens de treksterkte klimaatklasse Type belasting I II III eigen gewicht

630. opgelegde vloerbelasting

631. Middellang

632. wind, sneeuw

633. bijzondere belasting

634. kdef Klimaatklasse I II III gezaagd hout

635. Multiplex deel 1

636. OSB EN300 OSB/2

637. OSB/3,OSB/4

638. Handelsnaam Botanische naam Herkomstgebied Sterkteklasse Kwaliteitsklasse / norm proefstukken NEN 6760 Andira (sucupira vermelho) 1) Andira spp. Brazilië D30 Tropisch / NPR 5493 Angelim vermelho 2)5) Dinizia excelsa Brazilië D50 Tropisch / NPR 5493 Azobé 4) Lophira alata West-Afrika D70 Tropisch / NPR 5493 Bangkirai Shorea spp. Indonesië D50 Tropisch / NPR 5493 Basralocus Dicorynia spp. Suriname C22 Tropisch / NPR 5493 Bilinga Nauclea diderrichii West- en Centraal Afrika D35 Tropisch / NPR 5493 Cumaru 2) Dypteryx spp. Brazilië D60 Tropisch / NPR 5493 Cupiuba (kopie) 1) Goupia glabra Brazilië D35 Tropisch / NPR 5493 Douglas, Europees 2) Pseudotsuga menziesii Europa C22 A/B / NEN 5468 Douglas, Europees 2) Pseudotsuga menziesii Europa C18 C / NEN 5468 Eiken, Pools Quercus petraea Polen C24 Europees / NPR 5493 Eiken, Midden-Europees Quercus petraea Midden-Europa C20 A/B / NEN 5477 Gonçalo Alves (muiracatiara) 1) Astronium lecointei Ducke Brazilië D40 Tropisch / NPR 5493 Grenen Pinus sylvestris Europa C24 A/B / NEN 5466 Grenen Pinus sylvestris Europa C18 C / NEN 5466 Groenhart 5) Tabebuia spp. Guyana D60 Tropisch / NPR 5493 Iroko Milicia excelsa Tropisch-Arika D40 HS / BS 5756 Itauba Mizilaurus itauba Brazilië D40 Tropisch / NPR 5493 Jarana Lecythis spp. Brazilië D40 Tropisch / NPR 5493 Jarrah Eucalyptus marginata Australië D40 HS / BS 5756 Karri, Australisch Eucalyptus diversicolor Australië D50 HS / BS 5756 Karri, Zuid-Afrikaans Eucalyptus diversicolor Zuid-Afrika D35 Tropisch / NPR 5493 Kempas Koompassia malaccensis Zuidoost-Azië D60 HS / BS 5756 Lariks Larix spp. Europa C24 A/B / NEN 5466 Lariks Larix spp. Europa C18 C / NEN 5466 Meranti, rode Shorea spp. Zuidoost-Azië C20 A/B / NEN 5483 Merbau Intsia spp. Zuidoost-Azië D60 HS / BS 5756 Mandioqueira (sucupira amarelo) 1) Qualea paraensis D. Brazilië D40 Tropisch / NPR 5493 Massaranduba 2) Manilkara spp. Brazilië D60 Tropisch / NPR 5493 Mukulungu 5) Autranella congolensis Kameroen D40 Tropisch / NPR 5493 Nargusta 2) Terminalia spp. Honduras C24 Tropisch / NPR 5493 Okan/Denya 2)5) Cylicodiscus gabunensis Ghana/Kameroen D50 Tropisch / NPR 5493 Piquia Caryocar villosum Brazilië D40 Tropisch / NPR 5493 Piquia marfim Aspidospermum desmanthum Brazilië D50 Tropisch / NPR 5493 Robinia Robinia pseudoacacia Hongarije D30 Europees / NPR 5493 Sapucaia Lecythis pisonis Brazilië D50 Tropisch / NPR 5493 Tali Erythrophleum spp. Kameroen/Kongo-Brazzaville D60 Tropisch / NPR 5493 Tali Erythrophleum spp. Ghana D40 Tropisch / NPR 5493 Teak Tectona grandis Zuidoost-Azië D40 HS / BS 5756 Uchi torrado 1) Sacoglottis guianensis Brazilië D40 Tropisch / NPR 5493 Vitex 2) Vitexcofassus spp. Tropisch Afrika D30 Tropisch / NPR 5493 Vuren Picea abies Europa C24 A/B / NEN 5466 Vuren Picea abies Europa C18 C / NEN 5466 vuren, grenen en lariks NEN 5466 / kwaliteitsklasse C = sterkteklasse C18

639. vuren, grenen en lariks NEN 5466 / kwaliteitsklasse B = sterkteklasse C24

640. europees douglas NEN 5468 / kwaliteitsklasse C = sterkteklasse C18

641. europees douglas NEN 5468 / kwaliteitsklasse A/B = sterkteklasse C22

642. BETON C12/15 C16/20 C20/25 C25/30 C30/37 C35/45 C40/50 C45/55 C50/60 C53/65 fck

643. εcu3(0/00)

644. % Als je een section kiest wil ik dat hij al standaard bijvoorbeeld een HEA100 geselecteerd heeft. Het bar venster moet dezelfde grootte hebben als je naar tabblad EN 1993 gaat

645. De krachtsverdeling is goed nu! Alleen nog geen zichtbaarheid in het canvas bij het eind van de staafaansluiting

646. Ik wil inloggen via Remmina op mijn server bij Hetzner, maar de verbinding valt direct uit

647. De server draait wel want alles werkt nog

648. Ok ik zie nu verschil

649. Maar ik wel het anders

650. De knoop blijft altijd hetzelfde

651. Afhankelijk van de aansluiting komt er direct naast de knoop op de staaf een extra symbool

652. Bij een scharnier is dat een 'bollejte' net iets kleiner dan de knoop, bij de veer een veertje, bij trek, + en bij fully fixed veranderd er niets

653. Ik wil nu de Z-spring en X-spring verbeteren

654. fy → y in subscript

655. fu → idem ook bij gamma

656. Ga verder met alles! Deel alles op in zoveel mogelijk agents en verwerkt alles, ook de eerder aangegeven wensen

657. heb je verbinding met de ERP-next van 3BM?

658. Bij een project heb je een locatie toch?

659. Ga door met de openstaande taken

660. Als de lineload min is blijven de pijlen naar beneden staan

661. Zet de qz bij een lijnlast standaard op -3. Zorg dat als je de lijnlast plaatst dat de cursor direct in dat veld staat en de tekst geselecteerd heeft zodat je gelijk kunt gaan typen

662. Snap to grid moet standaard uit staan

663. Bij restart een andere default constructie instellen. Ligger op 3 steunpunten met een q-last in 1 veld van -3

664. Voeg een Python/Javascript/Rust console toe onder 'View' Die komt rechts

665. Daar kun je zelf commando's geven

666. Je kunt ook zien welke commando's er verstuurd worden vanuit het programma

667. oK PAK DIE OP

668. Maak een eerste opzet voor de berekening van een momentverbinding in staal volgens de eurocode. Voeg die knop toe aan de toolbar ‘steel’

669. Bij betonligger. Deze moet gekoppeld zijn qua lengte aan de balk. Hoofdwapening en beugels moet wijzigbaar zijn. Tevens momentenlijn en dekkingslijn weergeven

670. Voeg meertaligheid toe. Voeg Nederlands als taal toe. Bij Settings moet je taal kunnen wisselen. Ik wil een totale taalupdate in het programma zonder dat je verder een harde refresh of herstart nodig hebt

671. knoppen met vlaggen. Plate moet een IfcWall worden in 3D. Nodes, bars e.d. ook meenemen naar IFC maar default onzichtbaar zetten

672. Voeg selecteerbaarheid toe in 3D en een propertiesvenster voor IfcProperties

673. Breid Frame solver uit naar Fysisch Niet Lineair voor Staal en Betondoorsnede Breid plate solver uit voor FNL voor beton. Bij beton wil ik de mogelijkheid om wapeningsnetten en staven toe te voegen


## 2026-02-06

674. De q-last moet beter selecteerbaar zijn. Ik wil dat je een shapehandle krijgt voor de lengte richting

675. Maak een md file met een lijst van alle prompts die ik in dit project gestopt hebt

676. Die zouden ergens opgeslagen moeten worden

677. Als ik prompts geef met bijvoorbeeld 15 deelinstructies graag onderscheid maken in deelinstructies. Zodat het een totale lijst is van misschien wel 1000 regels met zoveel mogelijk de letterlijke tekst die ik gebruik hebt

