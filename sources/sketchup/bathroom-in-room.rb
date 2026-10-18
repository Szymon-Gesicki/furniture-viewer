# Lazienka - zabudowa geberitu i szafki v1 (mm). Konsola Ruby:
#   load File.expand_path('~/Downloads/lazienka-w-pomieszczeniu.rb')
M = Sketchup.active_model
M.start_operation("Lazienka meble v11", true)
$laz_room = true
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
AGD    = mat("AGD",              [120, 122, 125])
ZLEW   = mat("Zlew",             [ 70,  72,  75])
NOZKA  = mat("Nozka_klips (okucie, nie ciac)", [60, 60, 62])
RAW    = mat("BEZ_OKLEINY (surowa krawedz)", [105, 62, 30])
LISTWA = mat("Listwa_montazowa_18", [196, 184, 166])
DNO16  = mat("Dno_szuflady_16",  [228, 220, 208])
STAL   = mat("Blum_Merivobox_stal (okucie, nie ciac)", [150, 152, 156])

# znacznik w folderze (foldery dzialaja od SketchUp 2021)
def tg(folder, name)
  l = M.layers[name] || M.layers.add(name)
  if M.layers.respond_to?(:add_folder) && l.respond_to?(:folder=)
    f = M.layers.folders.find { |x| x.name == folder } || M.layers.add_folder(folder)
    l.folder = f
  end
  l
end

ROOT = M.active_entities.add_group
ROOT.name  = "Lazienka_meble_v11"
ROOT.layer = tg("Lazienka", "Lazienka - meble (calosc)")

# ---- oklejanie: krawedzie BEZ okleiny maluje na brazowo (RAW), oklejone zostaja w kolorze plyty ----
def band_rule(name)
  case name
  when /Otwor|Stelaz/ then :skip
  when /R2 Blenda/ then [:front]
  when /U5 Bok/ then [:front]
  when /U3 Blenda/ then [:left, :bottom]
  when /U4 Blenda/ then [:bottom]
  when /AGD|Zlew|Bateria|Plyta indukcyjna|Nozka|Stopka|Klips|Merivobox/ then :skip
  when /Plecy HDF|Klocek|Poprzeczka|Pasek|Cokol|Dno 16mm|Okladzina lewej|Plyta nad blatem|Plyta za zlewem/ then []
  when /Tyl 16mm/ then [:top]
  when /Dno blendy/ then [:front]
  when /G1 Blenda/ then [:right, :top, :bottom]
  when /G5 Blenda/ then [:left, :top, :bottom]
  when /G6 Blenda|L7 Blenda/ then [:bottom]
  when /Front|Drzwi|Szuflada|Blenda/ then :all
  when /Plyta bok wneki|Bok lodowki|L3 Wieniec|L4 Wieniec/ then [:right]
  when /Bok ozdobny/ then [:left]
  when /Blat sciana/ then [:front]
  when /Blat Elka/ then [:left, :front]
  when /Blat zlew/ then [:right]
  when /^G\d Bok [LP] / then [:front, :bottom]
  when /Trawers przod pionowy/ then [:bottom]
  when /Trawers tyl/ then []
  when /Bok [LP] |Wieniec|Polka|Trawers przod/ then [:front]
  else []
  end
end

def apply_band(g, name, yflip, ext)
  rule = band_rule(name)
  return if rule == :skip
  thin = ext.index(ext.min)               # 0=x 1=y 2=z
  fr = yflip ? :yn : :yp; bk = yflip ? :yp : :yn
  map = { left: :xn, right: :xp, top: :zp, bottom: :zn, front: fr, back: bk }
  want = rule == :all ? nil : rule.map { |r| map[r] }
  g.entities.grep(Sketchup::Face).each do |f|
    n = f.normal
    ax = [n.x.abs, n.y.abs, n.z.abs]; i = ax.index(ax.max)
    next if i == thin
    d = [[:xn, :xp], [:yn, :yp], [:zn, :zp]][i][(i == 0 ? n.x : (i == 1 ? n.y : n.z)) > 0 ? 1 : 0]
    f.material = RAW unless want.nil? || want.include?(d)
  end
end

def box(ents, name, x0, x1, y0, y1, z0, z1, m, layer = nil, yflip = false)
  g = ents.add_group
  g.name = name
  pts = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]].map { |p| Geom::Point3d.new(p[0].mm, p[1].mm, p[2].mm) }
  f = g.entities.add_face(pts)
  f.reverse! if f.normal.z < 0
  f.pushpull((z1 - z0).mm)
  g.material = m
  g.layer = layer if layer
  apply_band(g, name, yflip, [(x1 - x0).abs, (y1 - y0).abs, (z1 - z0).abs])
  g
end

# uklad "z rzutu": x wzdluz sciany na wprost, y od sciany w strone salonu
def wbox(name, x0, x1, y0, y1, z0, z1, m, layer = nil, ents = ROOT.entities)
  box(ents, name, x0, x1, -y1, -y0, z0, z1, m, layer, true)
end

$cur_t = nil
def cabinet(name, origin, xaxis, yaxis)
  g = ROOT.entities.add_group
  g.name = name
  o = Geom::Point3d.new(origin[0].mm, origin[1].mm, origin[2].mm)
  t = Geom::Transformation.axes(o, Geom::Vector3d.new(*xaxis), Geom::Vector3d.new(*yaxis), Geom::Vector3d.new(0, 0, 1))
  $cur_t = t
  yield g.entities
  g.transform!(t)
  $cur_t = nil
  g
end

T = 18
def korpus(e, p, w, d, h, opts = {})
  l = tg("Korpusy", "Korpus #{p}")
  if opts[:wieniec_gorny]
    # szafki wiszace: dno miedzy bokami
    box(e, "#{p} Bok L #{h}x#{d}", 0, T, 0, d, 0, h, KORPUS, l)
    box(e, "#{p} Bok P #{h}x#{d}", w - T, w, 0, d, 0, h, KORPUS, l)
    box(e, "#{p} Wieniec dolny #{w - 2 * T}x#{d}", T, w - T, 0, d, 0, T, KORPUS, l)
  else
    # szafki dolne: boki STOJA na wiencu dolnym (wieniec na cala szerokosc).
    # Ciezar idzie z bokow prosto na wieniec i nozki; wkrety od spodu (schowane za cokolem).
    box(e, "#{p} Wieniec dolny (pod bokami) #{w}x#{d}", 0, w, 0, d, 0, T, KORPUS, l)
    box(e, "#{p} Bok L #{h - T}x#{d}", 0, T, 0, d, T, h, KORPUS, l)
    box(e, "#{p} Bok P #{h - T}x#{d}", w - T, w, 0, d, T, h, KORPUS, l)
  end
  if opts[:gorny_pelny]
    # plytka szafka (170): zamiast dwoch trawersow 100 (nachodzilyby na siebie) jeden wieniec gorny miedzy bokami
    box(e, "#{p} Wieniec gorny (miedzy bokami) #{w - 2 * T}x#{d}", T, w - T, 0, d, h - T, h, KORPUS, l)
  elsif opts[:wieniec_gorny]
    box(e, "#{p} Wieniec gorny #{w - 2 * T}x#{d}", T, w - T, 0, d, h - T, h, KORPUS, l)
  else
    if opts[:trawersy_pionowe]
      # trawersy na sztorc (pionowo) - nie koliduja ze zlewem / plyta indukcyjna
      box(e, "#{p} Trawers przod pionowy #{w - 2 * T}x100", T, w - T, d - T, d, h - 100, h, KORPUS, l)
      if opts[:tyl_obnizony]
        box(e, "#{p} Trawers tyl pionowy obnizony o 10 (pod plyta indukcyjna) #{w - 2 * T}x100", T, w - T, 0, T, h - 110, h - 10, KORPUS, l)
      elsif !opts[:bez_trawersu_tyl]
        box(e, "#{p} Trawers tyl pionowy #{w - 2 * T}x100", T, w - T, 0, T, h - 100, h, KORPUS, l)
      end
    else
      box(e, "#{p} Trawers przod #{w - 2 * T}x100", T, w - T, d - 100, d, h - T, h, KORPUS, l)
      box(e, "#{p} Trawers tyl #{w - 2 * T}x100", T, w - T, 0, 100, h - T, h, KORPUS, l)
    end
  end
  box(e, "#{p} Plecy HDF #{w}x#{h}", 0, w, -3, 0, 0, h, HDF, l) unless opts[:bez_plecow]
end
def polka(e, p, w, d, z)
  box(e, "#{p} Polka #{w - 2 * T}x#{d}", T, w - T, 0, d, z, z + T, KORPUS, tg("Korpusy", "Korpus #{p}"))
end
def front(e, p, label, d, x0, x1, z0, z1)
  n = "#{p} #{label} #{(x1 - x0).round}x#{(z1 - z0).round}"
  box(e, n, x0, x1, d, d + T, z0, z1, FRONT, tg("Fronty", "Front #{p} #{label}"))
end


# ================= LAZIENKA: zabudowa geberitu + 3 szafki =================
# Uklad: x od LEWEGO boku stelaza geberitu (0) w prawo do prawej sciany (1083), y od sciany tylnej do lazienki, z od podlogi.
GW = 607; GD = 170; GH = 1116; WALL = 1083     # stelaz 607 szer., wystaje 160-170, wys. 1114-1116
# prawa sciana: plytki 10 mm + klej (paca 6 mm -> po docisnieciu ok. 3-4 mm) = ok. 14 mm, + 2 mm luzu
# ZMIERZONE po polozeniu plytek: od prawego boku stelaza do plytek 462 (dol) / 465 (srodek) / 460 (gora stelaza)
SPACE = 460                                    # bierzemy najmniejszy wymiar
LUZ = 3                                        # luz miedzy blenda R2 a plytkami w najwezszym miejscu
WT = GW + SPACE                                # lico plytek 1067
CEIL = 2355; NAD = 20                          # sufit 2355-2361
ZT = GH + T                                    # gora zabudowy 1134
UPT = CEIL - 50                                # gora szafek wiszacych (blenda ~50 pod sufitem)
FD = GD + T                                    # lico frontow 188
BR = [-1, 0, 0]; BRY = [0, -1, 0]
OT = tg("Lazienka", "Otwory WC (do zmierzenia)")

# ---------- ZABUDOWA GEBERITU ----------
# laczenie: boki na pelna wysokosc, wieniec gorny MIEDZY bokami (plytszy), front na calosc nachodzi na boki i wieniec
wbox("GB Bok L zabudowy #{ZT}x#{GD}", -T, 0, 0, GD, 0, ZT, KORPUS, tg("Korpusy", "Zabudowa geberitu"))
wbox("GB Bok P zabudowy #{ZT}x#{GD}", GW, GW + T, 0, GD, 0, ZT, KORPUS, tg("Korpusy", "Zabudowa geberitu"))
wbox("GB Wieniec gorny zabudowy #{GW}x#{GD} (miedzy bokami)", 0, GW, 0, GD, GH, ZT, KORPUS, tg("Korpusy", "Zabudowa geberitu"))
# front pomniejszony o 2 mm z lewej, z prawej i u gory: szczeliny takie same jak miedzy drzwiami (4 mm) i przy blendach (2 mm)
wbox("GB Front zabudowy #{GW + 2 * T - 4}x#{ZT - 2} (otwory WC + przycisk)", -T + 2, GW + T - 2, GD, FD, 0, ZT - 2, FRONT, tg("Fronty", "Front zabudowy geberitu"))
cx = GW / 2.0
wbox("Otwor odplyw ~110 (pozycja do zmierzenia)", cx - 55, cx + 55, FD, FD + 1, 175, 285, ZLEW, OT)
wbox("Otwor sruba L (do zmierzenia)", cx - 98, cx - 82, FD, FD + 1, 322, 338, ZLEW, OT)
wbox("Otwor sruba P (do zmierzenia)", cx + 82, cx + 98, FD, FD + 1, 322, 338, ZLEW, OT)
wbox("Otwor rura splukujaca ~50 (do zmierzenia)", cx - 25, cx + 25, FD, FD + 1, 355, 405, ZLEW, OT)
wbox("Otwor przycisk/rewizja ~245x165 (wg szablonu)", cx - 122, cx + 122, FD, FD + 1, 920, 1085, ZLEW, OT)

# ---------- SZAFKA DOLNA OBOK (na plycie-podstawie lezacej na podlodze) ----------
RW = SPACE - T - T - LUZ                      # 421 = 460 - bok zabudowy 18 - blenda 18 - luz 3
wbox("R0 Wieniec podstawy (plyta na podlodze, pod szafka i blenda)", GW + T, WT + NAD, 0, FD, 0, T, KORPUS, tg("Korpusy", "Korpus R1"))
cabinet("R1 Szafka dolna #{RW}", [GW + T + RW, 0, T], BR, BRY) do |e|
  korpus(e, "R1", RW, GD, ZT - T, gorny_pelny: true)
  polka(e, "R1", RW, GD - 20, 274)
  polka(e, "R1", RW, GD - 20, 549)
  polka(e, "R1", RW, GD - 20, 823)
  front(e, "R1", "Drzwi (zawiasy P)", GD, 2, RW - 2, 2, ZT - T - 2)
end
# prawa blenda: zwykla plyta 18 na pelna glebokosc (jak bok), wsuwana w szczeline 20 mm miedzy szafkami a plytkami,
# przykrecana od srodka przez boki R1 i U2. Stoi na podstawie R0, siega do sufitu (jak bok U5). Oklejona tylko krawedz przednia.
wbox("R2 Blenda P plyta #{FD}x#{(CEIL + NAD - T).round} (do sufitu z naddatkiem, dotnij; wsun miedzy szafki a plytki)", GW + T + RW, GW + T + RW + T, 0, FD, T, CEIL + NAD, FRONT, tg("Blendy i cokoly", "Lazienka blenda prawa"))
# lewa strona: bok na cala wysokosc (od podlogi do blendy pod sufitem), zakrywa bok zabudowy i szafki nad geberitem
wbox("U5 Bok lewy od podlogi do sufitu #{CEIL + NAD}x#{FD} (z naddatkiem, dotnij pod sufit)", -2 * T, -T, 0, FD, 0, CEIL + NAD, FRONT, tg("Blendy i cokoly", "Lazienka bok lewy"))

# ---------- SZAFKI WISZACE (stoja na zabudowie i szafce dolnej) ----------
UH = UPT - ZT
cabinet("U1 Szafka nad geberitem #{GW + 2 * T}", [GW + T, 0, ZT], BR, BRY) do |e|
  korpus(e, "U1", GW + 2 * T, GD, UH, wieniec_gorny: true)
  # dol: wysoka przegroda ~400 mm na duze butelki, wyzej 3 nizsze (~220-235 mm)
  polka(e, "U1", GW + 2 * T, GD - 20, 420)
  polka(e, "U1", GW + 2 * T, GD - 20, 660)
  polka(e, "U1", GW + 2 * T, GD - 20, 900)
  hw = (GW + 2 * T) / 2.0
  front(e, "U1", "Drzwi prawe (zawiasy P)", GD, 2, hw - 1.5, 2, UH - 2)
  front(e, "U1", "Drzwi lewe (zawiasy L)", GD, hw + 1.5, GW + 2 * T - 2, 2, UH - 2)
end
cabinet("U2 Szafka gorna #{RW}", [GW + T + RW, 0, ZT], BR, BRY) do |e|
  korpus(e, "U2", RW, GD, UH, wieniec_gorny: true)
  polka(e, "U2", RW, GD - 20, 288)
  polka(e, "U2", RW, GD - 20, 576)
  polka(e, "U2", RW, GD - 20, 865)
  front(e, "U2", "Drzwi (zawiasy P)", GD, 2, RW - 2, 2, UH - 2)
end
wbox("U4 Blenda pod sufit #{GW + T + RW + T}x#{CEIL + NAD - UPT} (miedzy blendami U5 i R2, wysokosc z naddatkiem, dotnij)", -T, GW + T + RW, GD, FD, UPT, CEIL + NAD, FRONT, tg("Blendy i cokoly", "Lazienka blenda pod sufit"))

# ---------- POMIESZCZENIE (sciany proste, wg pomiarow) ----------
if $laz_room
  rg = ROOT.entities.add_group; rg.name = "Lazienka_pomieszczenie"
  re = rg.entities
  RT = tg("Lazienka", "Lazienka - pomieszczenie")
  SC = mat("Sciana_lazienka", [236, 236, 232])
  SF = mat("Sufit_lazienka", [248, 248, 248], 0.6)
  PD = mat("Podloga_lazienka", [200, 195, 185])
  GKM = mat("Geberit_stelaz_GK", [190, 190, 196])
  wbox("Sciana tylna", -400, WALL, -50, 0, 0, 2361, SC, RT, re)
  wbox("Sciana prawa", WALL, WALL + 50, -50, 1600, 0, 2361, SC, RT, re)
  wbox("Podloga", -400, WALL, 0, 1600, -10, 0, PD, RT, re)
  wbox("Sufit", -400, WALL, 0, 1600, 2355, 2365, SF, tg("Lazienka", "Lazienka - sufit"), re)
  wbox("Plytki + klej na prawej scianie (lico zmierzone)", WT, WALL, 0, 1600, 0, 2355, mat("Plytki_sciana", [220, 225, 228]), RT, re)
  wbox("Stelaz geberitu (obudowany) 607x165x1115", 0, GW, 0, 165, 0, 1115, GKM, RT, re)
end

off = $laz_off || [3500, 0, 0]
ROOT.transform!(Geom::Transformation.translation(off.map { |v| v.mm }))
M.commit_operation
puts "Gotowe: lazienka wczytana (przesunieta o #{off[0]} mm w prawo od kuchni)."
$laz_room = nil
