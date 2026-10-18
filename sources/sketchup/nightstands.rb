# Szafki nocne 2 szt. v2 (mm) + sciana i lozko. Konsola Ruby:
#   load File.expand_path('~/Downloads/szafki-nocne.rb')
M = Sketchup.active_model
def mat(name, rgb, a = 1.0)
  m = M.materials[name] || M.materials.add(name)
  m.color = Sketchup::Color.new(*rgb)
  m.alpha = a
  m
end
KORPUS = mat("Korpus_kaszmir",   [214, 202, 186])
FRONT  = mat("Front_kaszmir",    [205, 191, 174])
DREWNO = mat("Drewno_blat",      [168, 124,  84])
HDF    = mat("Plecy_HDF",        [235, 230, 222])
RAW    = mat("BEZ_OKLEINY (surowa krawedz)", [105, 62, 30])
OKUCIE = mat("Nozka_klips (okucie, nie ciac)", [60, 60, 62])
SCIANA = mat("Sciana_sypialnia", [238, 236, 230])
SUFIT  = mat("Sufit_sypialnia", [248, 248, 248], 0.5)
PODL   = mat("Podloga_sypialnia", [190, 170, 145])
LOZKO  = mat("Lozko_tapicerka", [150, 155, 165])
MATER  = mat("Materac", [240, 240, 240])

def tg(folder, name)
  l = M.layers[name] || M.layers.add(name)
  if M.layers.respond_to?(:add_folder) && l.respond_to?(:folder=)
    f = M.layers.folders.find { |x| x.name == folder } || M.layers.add_folder(folder)
    l.folder = f
  end
  l
end
def apply_band(g, name, ext)
  rule = band_rule(name)
  return if rule == :skip
  thin = ext.index(ext.min)
  map = { left: :xn, right: :xp, top: :zp, bottom: :zn, front: :yn, back: :yp }   # lico do pokoju = -y SketchUpa
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
T = 18; GAP = 2
M.start_operation("Szafki nocne v3", true)
ROOT = M.active_entities.add_group
ROOT.name = "Szafki_nocne_v3"

def band_rule(name)
  case name
  when /Sciana|Podloga|Sufit|Lozko|Materac|Zaglowek|Zawias|Galka/ then :skip
  when /Plecy HDF/ then []
  when /Drzwiczki|Blat z plyty/ then :all     # blat z plyty laminowanej Dab Hudson - oklejony dookola
  when /Wieniec gorny/ then [:front, :left, :right]   # konce widac z boku pod blatem
  when /Bok|Wieniec|Polka/ then [:front]
  else []
  end
end

# ================= WYMIARY (zmieniaj tutaj) =================
RW = 2100                    # sciana
BW = 1600; BL = 2000         # lozko
SW = 230                     # szerokosc szafki (miejsce 250 po kazdej stronie lozka -> po 10 mm luzu)
SD = 300                     # glebokosc razem z drzwiczkami
SH = 550                     # wysokosc razem z blatem (ok. gora materaca)
KD = SD - T                  # glebokosc korpusu 282
ZB = 100                     # wieniec dolny 100 nad podloga (boki = "nozki")
ZS = 300                     # polka oddzielajaca otwarta wneke od schowka z drzwiczkami
ZT = SH - T                  # gora korpusu / spod blatu 532

# ================= POKOJ =================
rg = ROOT.entities.add_group; rg.name = "Sypialnia (sciana, lozko)"
re = rg.entities
RT = tg("Szafki nocne", "Sypialnia - sciany i lozko")
wbox("Sciana za lozkiem", -100, RW + 100, -100, 0, 0, 2600, SCIANA, RT, re)
wbox("Sciana lewa", -100, 0, 0, 2600, 0, 2600, SCIANA, RT, re)
wbox("Sciana prawa", RW, RW + 100, 0, 2600, 0, 2600, SCIANA, RT, re)
wbox("Podloga", -100, RW + 100, 0, 2600, -10, 0, PODL, RT, re)
bx = (RW - BW) / 2.0
wbox("Lozko rama 1600x2000", bx, bx + BW, 0, BL, 0, 350, LOZKO, RT, re)
wbox("Materac 1600x2000", bx + 10, bx + BW - 10, 60, BL - 10, 350, 550, MATER, RT, re)
wbox("Zaglowek", bx, bx + BW, 0, 60, 0, 1000, LOZKO, RT, re)

rg.erase! if $tylko_meble        # przy liczeniu plyt (plik wszystkie-meble) pomieszczenie nie jest rysowane

# ================= SZAFKA =================
# boki od podlogi pod wieniec gorny (to sa "nozki"); wieniec gorny NA bokach na cala szerokosc - wkrety z gory w boki,
# potem na wieniec przykrecasz blat ze sklejki. Wieniec dolny i polka MIEDZY bokami. Z tylu plecy HDF na cala szerokosc.
def szafka(p, x0)
  l = tg("Szafki nocne", "Szafka #{p}")
  y0 = 10                                    # 10 mm od sciany (listwa przypodlogowa)
  y1 = y0 + KD
  iw = SW - 2 * T
  wbox("#{p} Bok L #{ZT - T}x#{KD}", x0, x0 + T, y0, y1, 0, ZT - T, KORPUS, l)
  wbox("#{p} Bok P #{ZT - T}x#{KD}", x0 + SW - T, x0 + SW, y0, y1, 0, ZT - T, KORPUS, l)
  wbox("#{p} Wieniec gorny (na bokach) #{SW}x#{KD}", x0, x0 + SW, y0, y1, ZT - T, ZT, KORPUS, l)
  wbox("#{p} Wieniec dolny #{iw}x#{KD}", x0 + T, x0 + SW - T, y0, y1, ZB, ZB + T, KORPUS, l)
  wbox("#{p} Polka #{iw}x#{KD}", x0 + T, x0 + SW - T, y0, y1, ZS, ZS + T, KORPUS, l)
  wbox("#{p} Plecy HDF #{SW}x#{ZT - ZB}", x0, x0 + SW, y0 - 3, y0, ZB, ZT, HDF, l)
  wbox("#{p} Drzwiczki #{SW - 2 * GAP}x#{ZT - 2 - (ZS + 2)}", x0 + GAP, x0 + SW - GAP, y1, y1 + T, ZS + 2, ZT - 2, FRONT, tg("Szafki nocne", "Fronty"))
  wbox("#{p} Blat z plyty drewnianej (Dab Hudson) 18 #{SW}x#{KD + T + 10} (wystaje 10 przed drzwiczki, oklejony dookola)", x0, x0 + SW, y0, y1 + T + 10, ZT, SH, DREWNO, tg("Szafki nocne", "Blaty drewniane"))
end
szafka("N1 lewa", 10)
szafka("N2 prawa", RW - 10 - SW)

off = $sn_off || [11000, 0, 0]
ROOT.transform!(Geom::Transformation.translation(off.map { |v| v.mm }))
M.commit_operation
puts "Gotowe: szafki nocne (przesuniete o #{off[0]} mm od kuchni)."
