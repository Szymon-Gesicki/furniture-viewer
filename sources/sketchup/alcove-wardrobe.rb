# Szafa w niszy na korytarzu v3 (mm) + model niszy. Konsola Ruby:
#   load File.expand_path('~/Downloads/szafa-wneka.rb')
# Nisza 1200 x 2350, gleboko 600 do oscieznicy drzwi (sciany krzywe - tu proste, do zmierzenia).
# Uklad: x od lewej sciany niszy, y od sciany tylnej w strone korytarza, z od podlogi.
# Szafa = 3 osobne korpusy na nozkach (schowek na miotle/odkurzacz 400, kurtki + buty 730, pawlacz 1130 na gorze),
# ustawione na srodku i obudowane blendami: boczne, gorna i cokol - dociete do krzywych scian na miejscu.
M = Sketchup.active_model
M.start_operation("Szafa wneka v3", true)
def mat(name, rgb, a = 1.0)
  m = M.materials[name] || M.materials.add(name)
  m.color = Sketchup::Color.new(*rgb)
  m.alpha = a
  m
end
KORPUS = mat("Korpus_kaszmir",   [214, 202, 186])
FRONT  = mat("Front_kaszmir",    [205, 191, 174])
HDF    = mat("Plecy_HDF",        [235, 230, 222])
LISTWA = mat("Listwa_montazowa_18", [196, 184, 166])
RAW    = mat("BEZ_OKLEINY (surowa krawedz)", [105, 62, 30])
OKUCIE = mat("Nozka_klips (okucie, nie ciac)", [60, 60, 62])
SCIANA = mat("Sciana_korytarz", [238, 236, 230])
SUFIT  = mat("Sufit_korytarz", [248, 248, 248], 0.5)
PODL   = mat("Podloga_korytarz", [190, 170, 145])
DRZWI  = mat("Drzwi_wejsciowe", [90, 80, 70])

def tg(folder, name)
  l = M.layers[name] || M.layers.add(name)
  if M.layers.respond_to?(:add_folder) && l.respond_to?(:folder=)
    f = M.layers.folders.find { |x| x.name == folder } || M.layers.add_folder(folder)
    l.folder = f
  end
  l
end

ROOT = M.active_entities.add_group
ROOT.name = "Szafa_wneka_v3"

# ---- oklejanie: krawedzie BEZ okleiny maluje na brazowo ----
def band_rule(name)
  case name
  when /Sciana|Podloga|Sufit|Drzwi do pokoju|Oscieznica|Nozka|Stopka|Klips|Drazek|Zawias/ then :skip
  when /Plecy HDF|Klocek|Cokol/ then []
  when /Blenda boczna L/ then [:right]          # krawedz przy drzwiach; od sciany dociete
  when /Blenda boczna P/ then [:left]
  when /Blenda gorna/ then [:bottom]
  when /Drzwi/ then :all
  when /Bok|Wieniec|Polka|Przegroda/ then [:front]
  else []
  end
end
def apply_band(g, name, ext)
  rule = band_rule(name)
  return if rule == :skip
  thin = ext.index(ext.min)
  map = { left: :xn, right: :xp, top: :zp, bottom: :zn, front: :yn, back: :yp }   # lico do korytarza = -y SketchUpa
  want = rule == :all ? nil : rule.map { |r| map[r] }
  g.entities.grep(Sketchup::Face).each do |f|
    n = f.normal
    ax = [n.x.abs, n.y.abs, n.z.abs]; i = ax.index(ax.max)
    next if i == thin
    d = [[:xn, :xp], [:yn, :yp], [:zn, :zp]][i][(i == 0 ? n.x : (i == 1 ? n.y : n.z)) > 0 ? 1 : 0]
    f.material = RAW unless want.nil? || want.include?(d)
  end
end
def wbox(name, x0, x1, y0, y1, z0, z1, m, layer = nil, ents = ROOT.entities)
  g = ents.add_group
  g.name = name
  pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
  f = g.entities.add_face(pts.map { |x, y| Geom::Point3d.new(x.mm, -y.mm, z0.mm) })
  f.reverse! if f.normal.z < 0
  f.pushpull((z1 - z0).mm)
  g.material = m
  g.layer = layer if layer
  apply_band(g, name, [(x1 - x0).abs, (y1 - y0).abs, (z1 - z0).abs])
  g
end

# ================= WYMIARY =================
T = 18; NAD = 20; GAP = 2
# POMIARY niszy: szerokosc 1204 (dol) / 1202 (srodek) / 1195 (gora)
# wysokosc do wylewki 2418 / 2411 / 2408, minus panele 8 + podklad 4 = 2406 / 2399 / 2396 od gotowej podlogi
NWMIN = 1195; NWMAX = 1204
NHMIN = 2396; NHMAX = 2406
NW = NWMIN; NH = NHMIN; ND = 600          # model niszy rysowany po najmniejszych wymiarach
FF = 600                                  # lico frontow 600 od sciany tylnej
KD = 560                                  # glebokosc korpusow; z tylu ok. 22 mm luzu na krzywa sciane
KY0 = FF - T - KD; KY1 = FF - T           # korpus y 22..582
SW = 1130                                 # szerokosc szafy (400 buty + 730 kurtki)
X0 = ((NWMIN - SW) / 2.0).floor           # 32 -> po bokach 32-37 mm na blendy
XS = X0 + 400; X1 = X0 + SW               # 32 | 432 | 1162
BW = ((NWMAX - SW) / 2.0).ceil + NAD      # szerokosc blendy bocznej 57 (dotniesz do 32-37)
LEG = 100; ZK = LEG                       # nozki 100 (regulacja ok. +/-15), korpusy od 100
TH = 1800                                 # wysokosc slupkow (100..1900)
PH = 430                                  # wysokosc pawlacza (1900..2330)
ZP = ZK + TH; ZTOP = ZP + PH              # 1900, 2330 -> nad pawlaczem 66-76 mm na blende gorna

# ================= NISZA =================
rg = ROOT.entities.add_group; rg.name = "Nisza na korytarzu"
re = rg.entities
RT = tg("Szafa wneka", "Nisza - sciany")
wbox("Sciana tylna", -100, NW + 100, -100, 0, 0, NH, SCIANA, RT, re)
wbox("Sciana lewa", -100, 0, 0, ND + 1500, 0, NH, SCIANA, RT, re)
wbox("Sciana prawa do drzwi", NW, NW + 100, 0, ND, 0, NH, SCIANA, RT, re)
wbox("Sciana prawa nad drzwiami", NW, NW + 100, ND, ND + 900, 2060, NH, SCIANA, RT, re)
wbox("Sciana prawa za drzwiami", NW, NW + 100, ND + 900, ND + 1500, 0, NH, SCIANA, RT, re)
wbox("Oscieznica drzwi do pokoju", NW - 20, NW + 100, ND, ND + 30, 0, 2060, DRZWI, RT, re)
wbox("Drzwi do pokoju (skrzydlo)", NW + 20, NW + 60, ND + 30, ND + 870, 0, 2030, DRZWI, RT, re)
wbox("Podloga", -100, NW + 100, 0, ND + 1500, -10, 0, PODL, RT, re)
wbox("Sufit", -100, NW + 100, 0, ND + 1500, NH, NH + 10, SUFIT, tg("Szafa wneka", "Nisza - sufit"), re)

rg.erase! if $tylko_meble        # przy liczeniu plyt (plik wszystkie-meble) pomieszczenie nie jest rysowane

# ================= SZAFA =================
def korpus_dolny(p, x0, w, z0, h)
  l = tg("Szafa wneka", "Korpus #{p}")
  wbox("#{p} Wieniec dolny (pod bokami) #{w}x#{KD}", x0, x0 + w, KY0, KY1, z0, z0 + T, KORPUS, l)
  wbox("#{p} Bok L #{h - T}x#{KD}", x0, x0 + T, KY0, KY1, z0 + T, z0 + h, KORPUS, l)
  wbox("#{p} Bok P #{h - T}x#{KD}", x0 + w - T, x0 + w, KY0, KY1, z0 + T, z0 + h, KORPUS, l)
  wbox("#{p} Wieniec gorny (miedzy bokami) #{w - 2 * T}x#{KD}", x0 + T, x0 + w - T, KY0, KY1, z0 + h - T, z0 + h, KORPUS, l)
  wbox("#{p} Plecy HDF #{w}x#{h}", x0, x0 + w, KY0 - 3, KY0, z0, z0 + h, HDF, l)
end
def polka(p, x0, w, zl)                   # zl = spod polki od spodu korpusu
  wbox("#{p} Polka #{w - 2 * T}x#{KD - 20}", x0 + T, x0 + w - T, KY0, KY1 - 20, ZK + zl, ZK + zl + T, KORPUS, tg("Szafa wneka", "Korpus #{p}"))
end
def nozki(p, x0, w)
  l = tg("Szafa wneka", "Nozki i klipsy")
  [x0 + 50, x0 + w - 50].each do |x|
    [KY0 + 60, KY1 - 80].each do |y|
      wbox("#{p} Nozka 100 regulowana", x - 17, x + 17, y - 17, y + 17, 5, ZK, OKUCIE, l)
      wbox("#{p} Stopka nozki", x - 35, x + 35, y - 35, y + 35, 0, 5, OKUCIE, l)
    end
    wbox("#{p} Klips cokolu", x - 15, x + 15, KY1 - 48, KY1 - 40, 30, 70, OKUCIE, l)
  end
end
def drzwi(p, label, x0, x1, z0, z1)
  wbox("#{p} Drzwi #{label} #{(x1 - x0).round}x#{(z1 - z0).round}", x0, x1, KY1, FF, z0, z1, FRONT, tg("Szafa wneka", "Fronty"))
end
def zawiasy(xe, zs)
  zs.each { |z| wbox("Zawias puszkowy 35 (znacznik)", xe - 17.5, xe + 17.5, KY1 - 1, KY1, z - 17.5, z + 17.5, OKUCIE, tg("Szafa wneka", "Fronty")) }
end

# --- S1: schowek 400 - na dole 1200 mm wolnego na miotle / odkurzacz stojacy, wyzej 2 polki ---
korpus_dolny("S1 Schowek", X0, 400, ZK, TH)
[1218, 1500].each { |z| polka("S1 Schowek", X0, 400, z) }
nozki("S1", X0, 400)
drzwi("S1", "(zawiasy L)", X0 + GAP, XS - GAP, ZK + GAP, ZP - GAP)
zawiasy(X0 + GAP + 21.5, [ZK + 100, ZK + 650, ZP - 650, ZP - 100])

# --- S2: szafa na kurtki 730, 2 drzwi ---
korpus_dolny("S2 Kurtki", XS, 730, ZK, TH)
# na dole 2 niskie polki na buty (przegrodki po 182 mm), nad nimi wieszanie kurtek ok. 1280 mm
polka("S2 Kurtki", XS, 730, 200)
polka("S2 Kurtki", XS, 730, 400)
wbox("S2 Drazek owalny #{730 - 2 * T} (os ok. 70 pod wiencem)", XS + T, XS + 730 - T, KY0 + KD / 2.0 - 8, KY0 + KD / 2.0 + 8, ZP - T - 85, ZP - T - 55, OKUCIE, tg("Szafa wneka", "Korpus S2 Kurtki"))
nozki("S2", XS, 730)
xm = XS + 365
drzwi("S2", "lewe (zawiasy L)", XS + GAP, xm - GAP, ZK + GAP, ZP - GAP)
drzwi("S2", "prawe (zawiasy P)", xm + GAP, X1 - GAP, ZK + GAP, ZP - GAP)
zawiasy(XS + GAP + 21.5, [ZK + 100, ZK + 650, ZP - 650, ZP - 100])
zawiasy(X1 - GAP - 21.5, [ZK + 100, ZK + 650, ZP - 650, ZP - 100])

# --- P: pawlacz 1130 na slupkach (schowek na rzeczy sezonowe) ---
pl = tg("Szafa wneka", "Korpus P Pawlacz")
PW = X1 - X0
wbox("P Pawlacz Wieniec dolny (miedzy bokami) #{PW - 2 * T}x#{KD}", X0 + T, X1 - T, KY0, KY1, ZP, ZP + T, KORPUS, pl)
wbox("P Pawlacz Wieniec gorny (miedzy bokami) #{PW - 2 * T}x#{KD}", X0 + T, X1 - T, KY0, KY1, ZTOP - T, ZTOP, KORPUS, pl)
wbox("P Pawlacz Bok L #{PH}x#{KD}", X0, X0 + T, KY0, KY1, ZP, ZTOP, KORPUS, pl)
wbox("P Pawlacz Bok P #{PH}x#{KD}", X1 - T, X1, KY0, KY1, ZP, ZTOP, KORPUS, pl)
wbox("P Pawlacz Przegroda #{PH - 2 * T}x#{KD - 20} (nad podzialem slupkow)", XS - T / 2.0, XS + T / 2.0, KY0, KY1 - 20, ZP + T, ZTOP - T, KORPUS, pl)
wbox("P Pawlacz Plecy HDF #{PW}x#{PH}", X0, X1, KY0 - 3, KY0, ZP, ZTOP, HDF, pl)
drzwi("P", "nad schowkiem (zawiasy L)", X0 + GAP, XS - GAP, ZP + GAP, ZTOP - GAP)
drzwi("P", "lewe nad kurtkami (zawiasy L)", XS + GAP, xm - GAP, ZP + GAP, ZTOP - GAP)
drzwi("P", "prawe nad kurtkami (zawiasy P)", xm + GAP, X1 - GAP, ZP + GAP, ZTOP - GAP)
zawiasy(X0 + GAP + 21.5, [ZP + 80, ZTOP - 80])
zawiasy(XS + GAP + 21.5, [ZP + 80, ZTOP - 80])
zawiasy(X1 - GAP - 21.5, [ZP + 80, ZTOP - 80])

# --- BLENDY dookola (dociete do krzywych scian na miejscu) ---
bl = tg("Szafa wneka", "Blendy i cokol")
wbox("Blenda boczna L #{BW}x#{NHMAX + NAD} (z naddatkiem; dotnij do sciany 32-37 i pod sufit)", X0 - BW, X0, KY1, FF, 0, NHMAX + NAD, FRONT, bl)
wbox("Blenda boczna P #{BW}x#{NHMAX + NAD} (z naddatkiem; dotnij do sciany 32-37 i pod sufit)", X1, X1 + BW, KY1, FF, 0, NHMAX + NAD, FRONT, bl)
wbox("Blenda gorna #{PW}x#{NHMAX + NAD - ZTOP} (miedzy blendami bocznymi; dotnij pod sufit do 66-76)", X0, X1, KY1, FF, ZTOP, NHMAX + NAD, FRONT, bl)
wbox("Cokol #{PW}x#{LEG + 10} (miedzy blendami, cofniety 40 mm, na klipsach; dotnij do podlogi)", X0, X1, KY1 - 40, KY1 - 22, -10, LEG, FRONT, bl)
# klocki: blendy boczne przykrecasz do klockow, klocki do bokow korpusow (po 3 na strone)
[ZK + 300, ZK + 1100, ZP + 200].each do |z|
  wbox("Klocek montazowy blendy L 100x100", X0 - T, X0, KY1 - 100, KY1, z - 50, z + 50, LISTWA, bl)
  wbox("Klocek montazowy blendy P 100x100", X1, X1 + T, KY1 - 100, KY1, z - 50, z + 50, LISTWA, bl)
end
[X0 + 150, (X0 + X1) / 2.0, X1 - 150].each do |x|
  wbox("Klocek montazowy blendy gornej 100x100 (na pawlaczu)", x - 50, x + 50, KY1 - 100, KY1, ZTOP, ZTOP + T, LISTWA, bl)
end

off = $sw_off || [9000, 0, 0]
ROOT.transform!(Geom::Transformation.translation(off.map { |v| v.mm }))
M.commit_operation
puts "Gotowe: szafa w niszy (przesunieta o #{off[0]} mm od kuchni)."
