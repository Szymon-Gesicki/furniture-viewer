# Szafka na rozdzielnie (przy drzwiach) v4 (mm) + sciana z drzwiami, rozdzielnia, przewody, gniazdko.
# Konsola Ruby:  load File.expand_path('~/Downloads/szafka-rozdzielnia.rb')
# Uklad: x wzdluz sciany (0 = lewy bok szafki), y od sciany do pokoju, z od podlogi.
M = Sketchup.active_model
M.start_operation("Szafka rozdzielnia v4", true)
def mat(name, rgb, a = 1.0)
  m = M.materials[name] || M.materials.add(name)
  m.color = Sketchup::Color.new(*rgb)
  m.alpha = a
  m
end
KORPUS = mat("Korpus_kaszmir",   [214, 202, 186])
FRONT  = mat("Front_kaszmir",    [205, 191, 174])
LISTWA = mat("Listwa_montazowa_18", [196, 184, 166])
RAW    = mat("BEZ_OKLEINY (surowa krawedz)", [105, 62, 30])
OKUCIE = mat("Nozka_klips (okucie, nie ciac)", [60, 60, 62])
SCIANA = mat("Sciana_przedpokoj", [238, 236, 230])
SUFIT  = mat("Sufit_przedpokoj", [248, 248, 248], 0.5)
PODL   = mat("Podloga_przedpokoj", [190, 170, 145])
DRZWI  = mat("Drzwi_wejsciowe", [90, 80, 70])
ROZDZ  = mat("Rozdzielnia_biala", [245, 245, 242])
ROZDZ2 = mat("Rozdzielnia_okienko", [150, 160, 170], 0.7)
ELEKT  = mat("Przewody_gniazdko", [225, 225, 225])

def tg(folder, name)
  l = M.layers[name] || M.layers.add(name)
  if M.layers.respond_to?(:add_folder) && l.respond_to?(:folder=)
    f = M.layers.folders.find { |x| x.name == folder } || M.layers.add_folder(folder)
    l.folder = f
  end
  l
end

ROOT = M.active_entities.add_group
ROOT.name = "Szafka_rozdzielnia_v4"

# ---- oklejanie: krawedzie BEZ okleiny maluje na brazowo ----
def band_rule(name)
  case name
  when /Sciana|Podloga|Sufit|Drzwi wejsciowe|Oscieznica|Rozdzielnia|Przewody|Gniazdko|Zawias/ then :skip
  when /Listwa/ then []
  when /Plyta gorna|Wieniec/ then [:front, :left, :right]       # konce wiency widac z boku szafki, spod widac z dolu
  when /Drzwi/ then :all
  when /Bok|Polka|Przegroda/ then [:front]
  else []
  end
end
def apply_band(g, name, ext)
  rule = band_rule(name)
  return if rule == :skip
  thin = ext.index(ext.min)
  map = { left: :xn, right: :xp, top: :zp, bottom: :zn, front: :yn, back: :yp }   # y odwrocone (lico do pokoju = -y SketchUpa)
  want = rule == :all ? nil : rule.map { |r| map[r] }
  g.entities.grep(Sketchup::Face).each do |f|
    n = f.normal
    ax = [n.x.abs, n.y.abs, n.z.abs]; i = ax.index(ax.max)
    next if i == thin
    d = [[:xn, :xp], [:yn, :yp], [:zn, :zp]][i][(i == 0 ? n.x : (i == 1 ? n.y : n.z)) > 0 ? 1 : 0]
    f.material = RAW unless want.nil? || want.include?(d)
  end
end
# plyta z obrysu w rzucie (punkty [x, y] w ukladzie "od sciany"), od z0 do z1
def plate(name, pts, z0, z1, m, layer = nil, ents = ROOT.entities)
  g = ents.add_group
  g.name = name
  f = g.entities.add_face(pts.map { |x, y| Geom::Point3d.new(x.mm, -y.mm, z0.mm) })
  f.reverse! if f.normal.z < 0
  f.pushpull((z1 - z0).mm)
  g.material = m
  g.layer = layer if layer
  xs = pts.map(&:first); ys = pts.map(&:last)
  apply_band(g, name, [xs.max - xs.min, ys.max - ys.min, (z1 - z0).abs])
  g
end
def wbox(name, x0, x1, y0, y1, z0, z1, m, layer = nil, ents = ROOT.entities)
  plate(name, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], z0, z1, m, layer, ents)
end

# ================= WYMIARY =================
T   = 18
W   = 450          # szerokosc szafki
D   = 122          # glebokosc korpusu; z drzwiami 18 mm razem 140
H   = 2250         # wysokosc szafki
Z0  = 150          # spod szafki nad podloga
ZT  = Z0 + H       # gora szafki = sufit 2400
CEIL = ZT
UPD = 550          # wysokosc gornych drzwi
GAP = 2            # szczelina frontu od krawedzi
ZS  = ZT - UPD     # linia podzialu drzwi 1850
KT0 = ZT - T       # gora korpusu 2382; nad nim plyta gorna 18 do glebokosci frontu (drzwi koncza sie pod nia)

# rozdzielnia i gniazdko (IMITACJA - wymiary i pozycje do zmierzenia)
RX0 = (W - 330) / 2.0; RX1 = RX0 + 330; RZ0 = 1895; RZ1 = 2275      # rozdzielnia 330x380, wystaje ~15 mm
GZ  = 1200                                                       # srodek gniazdka
CX  = W / 2.0
NW  = 80; ND = 30                                                # wyciecie w polkach na przewody 80x30

# ================= POMIESZCZENIE =================
rg = ROOT.entities.add_group; rg.name = "Przedpokoj (sciana, drzwi, instalacja)"
re = rg.entities
RT = tg("Szafka rozdzielnia", "Przedpokoj - sciana i drzwi")
EL = tg("Szafka rozdzielnia", "Rozdzielnia, przewody, gniazdko")
DX0 = W + 100; DX1 = DX0 + 900; DH = 2060                          # otwor drzwi (oscieznica) - orientacyjnie
wbox("Sciana lewa czesc", -600, DX0, -100, 0, 0, CEIL, SCIANA, RT, re)
wbox("Sciana nad drzwiami", DX0, DX1, -100, 0, DH, CEIL, SCIANA, RT, re)
wbox("Sciana prawa czesc", DX1, DX1 + 600, -100, 0, 0, CEIL, SCIANA, RT, re)
wbox("Oscieznica lewa", DX0, DX0 + 30, -100, 20, 0, DH, DRZWI, RT, re)
wbox("Oscieznica prawa", DX1 - 30, DX1, -100, 20, 0, DH, DRZWI, RT, re)
wbox("Oscieznica gora", DX0, DX1, -100, 20, DH - 30, DH, DRZWI, RT, re)
wbox("Drzwi wejsciowe (skrzydlo)", DX0 + 30, DX1 - 30, -60, -20, 0, DH - 30, DRZWI, RT, re)
wbox("Podloga", -600, DX1 + 600, 0, 1500, -10, 0, PODL, RT, re)
wbox("Sufit", -600, DX1 + 600, 0, 1500, CEIL, CEIL + 10, SUFIT, tg("Szafka rozdzielnia", "Przedpokoj - sufit"), re)
wbox("Rozdzielnia - obudowa/ramka 330x380 (wystaje ~15)", RX0, RX1, 0, 15, RZ0, RZ1, ROZDZ, EL, re)
wbox("Rozdzielnia - okienko", RX0 + 30, RX1 - 30, 15, 17, RZ0 + 120, RZ1 - 120, ROZDZ2, EL, re)
wbox("Przewody - wiazka/listwa 60x20 do gniazdka", CX - 30, CX + 30, 0, 20, GZ + 40, RZ0, ELEKT, EL, re)
wbox("Gniazdko natynkowe 80x80 (wystaje ~40, z wtyczka ~90)", CX - 40, CX + 40, 0, 40, GZ - 40, GZ + 40, ELEKT, EL, re)

rg.erase! if $tylko_meble        # przy liczeniu plyt (plik wszystkie-meble) pomieszczenie nie jest rysowane

# ================= SZAFKA =================
KT = tg("Szafka rozdzielnia", "Szafka - korpus")
FT = tg("Szafka rozdzielnia", "Szafka - fronty")
# wience na plasko na cala szerokosc, boki MIEDZY wiencami (wkrety przez wience od gory i od dolu)
wbox("Wieniec dolny #{W}x#{D}", 0, W, 0, D, Z0, Z0 + T, KORPUS, KT)
wbox("Wieniec gorny #{W}x#{D}", 0, W, 0, D, KT0 - T, KT0, KORPUS, KT)
wbox("Plyta gorna #{W}x#{D + T} (na wiencu, do lica drzwi; przykrec od spodu)", 0, W, 0, D + T, KT0, ZT, KORPUS, KT)
wbox("Bok L #{H - 3 * T}x#{D} (zawiasy)", 0, T, 0, D, Z0 + T, KT0 - T, KORPUS, KT)
wbox("Bok P #{H - 3 * T}x#{D}", W - T, W, 0, D, Z0 + T, KT0 - T, KORPUS, KT)
IW = W - 2 * T
# polka z wycieciem z tylu na przewody
def polka_n(name, z, notch)
  if notch
    a = CX - NW / 2.0; b = CX + NW / 2.0
    plate("#{name} #{IW}x#{D} (wyciecie z tylu #{NW}x#{ND} na przewody)",
          [[T, 0], [a, 0], [a, ND], [b, ND], [b, 0], [W - T, 0], [W - T, D], [T, D]], z, z + T, KORPUS, KT)
  else
    wbox("#{name} #{IW}x#{D}", T, W - T, 0, D, z, z + T, KORPUS, KT)
  end
end
# przegroda na wysokosci szczeliny miedzy drzwiami (oddziela rozdzielnie)
polka_n("Przegroda pod rozdzielnia", ZS - T / 2.0, true)
# 3 polki w dolnej czesci: przegrodki od dolu 382 / 432 / 482 (z gniazdkiem) / ok. 314; gorna (rozdzielnia) 505 w swietle, konczy sie 550 od gory
polka_n("Polka 3 nad gniazdkiem", 1500, true)
polka_n("Polka 2 pod gniazdkiem", 1000, false)
polka_n("Polka 1 dolna", 550, false)
# wieszanie: zawieszki (np. slowackie) na kolkach w scianie - do dobrania, listw montazowych brak
# drzwi nakladane, zawiasy po LEWEJ (otwieranie w lewo)
wbox("Drzwi gorne #{W - 2 * GAP}x#{KT0 - ZS - 2 * GAP} (zawiasy L, 2 szt.)", GAP, W - GAP, D, D + T, ZS + GAP, KT0 - GAP, FRONT, FT)
wbox("Drzwi dolne #{W - 2 * GAP}x#{H - UPD - 2 * GAP} (zawiasy L, 4 szt.)", GAP, W - GAP, D, D + T, Z0 + GAP, ZS - GAP, FRONT, FT)
[ZS + 100, KT0 - 100, Z0 + 100, Z0 + 600, ZS - 600, ZS - 100].each do |zh|
  wbox("Zawias puszkowy 35 (znacznik)", 4, 39, D - 1, D, zh - 17.5, zh + 17.5, OKUCIE, FT)
end

off = $sr_off || [7000, 0, 0]
ROOT.transform!(Geom::Transformation.translation(off.map { |v| v.mm }))
M.commit_operation
puts "Gotowe: szafka na rozdzielnie (przesunieta o #{off[0]} mm od kuchni)."
