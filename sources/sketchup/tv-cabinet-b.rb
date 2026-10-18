# Szafka RTV - 2 warianty (mm): 1100 x 300 x 350 bez nozek. Korpusy i fronty kaszmir, obudowa L/P/gora drewno. Konsola Ruby:
#   load File.expand_path('~/Downloads/szafka-rtv.rb')
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
M.start_operation("Szafka RTV wariant B", true)
ROOT = M.active_entities.add_group
ROOT.name = "Szafka_RTV_wariant_B"

def band_rule(name)
  case name
  when /Sciana|Podloga|Telewizor|Nozka|Stopka|Zawias|Napis/ then :skip
  when /Plecy HDF/ then []
  when /Obudowa gora/ then [:front, :left, :right]
  when /Obudowa bok/ then [:front, :bottom]
  when /Drzwi|Klapa/ then :all
  when /Bok|Wieniec|Polka/ then [:front]
  else []
  end
end

# ================= WYMIARY WSPOLNE =================
W = 1100; D = 300; H = 350   # calosc: szer., gleb. z frontem, wys. bez nozek
LEG = 100; Y0 = 20
KD = D - T; KH = H - T       # korpus 282 gl., 332 wys.
ZB = LEG; KY0 = Y0; KY1 = Y0 + KD
GAPX = 1500                  # odstep miedzy wariantami w modelu

rg = ROOT.entities.add_group; rg.name = "Salon (sciana)"
re = rg.entities
RT = tg("Szafka RTV", "Salon - sciana")
wbox("Sciana", -600, W + 600, -100, 0, 0, 2500, SCIANA, RT, re)
wbox("Podloga", -600, W + 600, 0, 1500, -10, 0, PODL, RT, re)
rg.erase! if $tylko_meble

def korpus_rtv(p, x0, kw, polka)
  l = tg("Szafka RTV", "Korpus #{p}")
  wbox("#{p} Bok L #{KH}x#{KD}", x0, x0 + T, KY0, KY1, ZB, ZB + KH, KORPUS, l)
  wbox("#{p} Bok P #{KH}x#{KD}", x0 + kw - T, x0 + kw, KY0, KY1, ZB, ZB + KH, KORPUS, l)
  wbox("#{p} Wieniec dolny #{kw - 2 * T}x#{KD}", x0 + T, x0 + kw - T, KY0, KY1, ZB, ZB + T, KORPUS, l)
  wbox("#{p} Wieniec gorny #{kw - 2 * T}x#{KD}", x0 + T, x0 + kw - T, KY0, KY1, ZB + KH - T, ZB + KH, KORPUS, l)
  if polka
    # polka na podporkach (kolki 5 mm) - wysokosc do przestawiania; w srodku 296 -> 2 polki po ok. 139
    zp = ZB + T + ((KH - 2 * T - T) / 2.0).round
    wbox("#{p} Polka #{kw - 2 * T - 2}x#{KD - 20} (na podporkach, przestawna)", x0 + T + 1, x0 + kw - T - 1, KY0, KY1 - 20, zp, zp + T, KORPUS, l)
  end
  wbox("#{p} Plecy HDF #{kw}x#{KH} (otwor na kable wytnij na miejscu)", x0, x0 + kw, KY0 - 3, KY0, ZB, ZB + KH, HDF, l)
  nl = tg("Szafka RTV", "Nozki RTV")
  [x0 + 50, x0 + kw - 50].each do |x|
    [KY0 + 50, KY1 - 50].each do |y|
      wbox("#{p} Nozka 100", x - 17, x + 17, y - 17, y + 17, 5, ZB, OKUCIE, nl)
      wbox("#{p} Stopka nozki", x - 30, x + 30, y - 30, y + 30, 0, 5, OKUCIE, nl)
    end
  end
end
def obudowa(p, x0)
  ob = tg("Szafka RTV", "Obudowa drewniana")
  wbox("#{p} Obudowa bok L (drewno) #{KH}x#{D}", x0, x0 + T, KY0, KY0 + D, ZB, ZB + KH, DREWNO, ob)
  wbox("#{p} Obudowa bok P (drewno) #{KH}x#{D}", x0 + W - T, x0 + W, KY0, KY0 + D, ZB, ZB + KH, DREWNO, ob)
  wbox("#{p} Obudowa gora (drewno) #{W}x#{D}", x0, x0 + W, KY0, KY0 + D, ZB + KH, ZB + H, DREWNO, ob)
end
def front(p, label, x0, x1, z0, z1)
  wbox("#{p} #{label} #{(x1 - x0).round}x#{(z1 - z0).round}", x0, x1, KY1, KY1 + T, z0, z1, FRONT, tg("Szafka RTV", "Fronty RTV"))
end

# ---------- WARIANT B: 3 korpusy, 3 fronty: drzwi | drzwi | drzwi (wszystkie otwierane na bok) ----------
# srodek szerszy (na dekoder / konsole), boki wezsze; polki w bokach, srodek pusty pod sprzet
bx = 0
ws = [328, 408, 328]              # razem 1064
x = bx + T
labels = ["Drzwi (zawiasy L)", "Drzwi srodkowe (zawiasy L, otwierane na bok)", "Drzwi (zawiasy P)"]
ws.each_with_index do |w, i|
  korpus_rtv("RTV K#{i + 1}", x, w, i != 1)
  front("RTV K#{i + 1}", labels[i], x + 2, x + w - 2, ZB, ZB + KH - 2)
  x += w
end
obudowa("RTV", bx)

tv = tg("Szafka RTV", "Salon - sciana")
[bx].each { |x0| wbox("Telewizor 50 cali (orientacyjnie)", x0 + W / 2.0 - 560, x0 + W / 2.0 + 560, 0, 40, ZB + H + 200, ZB + H + 850, LOZKO, tv, rg.deleted? ? ROOT.entities : rg.entities) } unless $tylko_meble

off = $rtv_off || [17000, 0, 0]
ROOT.transform!(Geom::Transformation.translation(off.map { |v| v.mm }))
M.commit_operation
puts "Gotowe: szafka RTV (wariant B, 3 fronty), przesunieta o #{off[0]} mm od kuchni."
