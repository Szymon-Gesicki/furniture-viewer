# Kuchnia: pomieszczenie z pomiarow + gotowa podloga 11 mm + meble (podniesione o 11 mm).
# Uruchom w pustym modelu:  load File.expand_path('~/Downloads/kuchnia-w-pomieszczeniu.rb')
# Kuchnia - model pomieszczenia z pomiarow (mm). Uruchom w Konsoli Ruby SketchUpa.
model = Sketchup.active_model
model.start_operation("Kuchnia z pomiarow", true)
ents = model.active_entities
root = ents.add_group
root.name = "Kuchnia_pomiar"

tag = model.layers["Sciana lewa i wneki"] || model.layers.add("Sciana lewa i wneki")
mat = model.materials["Sciana_lewa_wneki"] || model.materials.add("Sciana_lewa_wneki")
mat.color = Sketchup::Color.new(237,234,227); mat.alpha = 1.0
g = root.entities.add_group; g.name = "Sciana_lewa_wneki"; g.layer = tag
[[[-707.5,-2180.0,-32.2],[-697.7,-1545.0,-31.2],[-697.7,-1545.0,100.0]],[[-707.5,-2180.0,-32.2],[-697.7,-1545.0,100.0],[-707.5,-2180.0,100.0]],[[-707.5,-2180.0,100.0],[-697.7,-1545.0,100.0],[-694.8,-1551.0,860.0]],[[-707.5,-2180.0,100.0],[-694.8,-1551.0,860.0],[-704.6,-2186.0,860.0]],[[-704.6,-2186.0,860.0],[-694.8,-1551.0,860.0],[-690.4,-1556.1,1500.0]],[[-704.6,-2186.0,860.0],[-690.4,-1556.1,1500.0],[-700.1,-2189.4,1500.0]],[[-700.1,-2189.4,1500.0],[-690.4,-1556.1,1500.0],[-687.0,-1560.0,2000.0]],[[-700.1,-2189.4,1500.0],[-687.0,-1560.0,2000.0],[-696.7,-2192.0,2000.0]],[[-696.7,-2192.0,2000.0],[-687.0,-1560.0,2000.0],[-687.0,-1560.0,2100.0]],[[-696.7,-2192.0,2000.0],[-687.0,-1560.0,2100.0],[-696.7,-2192.0,2100.0]],[[-696.7,-2192.0,2100.0],[-687.0,-1560.0,2100.0],[-687.0,-1560.0,2363.8]],[[-696.7,-2192.0,2100.0],[-687.0,-1560.0,2363.8],[-696.7,-2192.0,2363.5]],[[-697.7,-1545.0,-31.2],[-387.7,-1545.0,-30.7],[-387.7,-1545.0,100.0]],[[-697.7,-1545.0,-31.2],[-387.7,-1545.0,100.0],[-697.7,-1545.0,100.0]],[[-697.7,-1545.0,100.0],[-387.7,-1545.0,100.0],[-383.8,-1551.0,860.0]],[[-697.7,-1545.0,100.0],[-383.8,-1551.0,860.0],[-694.8,-1551.0,860.0]],[[-694.8,-1551.0,860.0],[-383.8,-1551.0,860.0],[-381.7,-1556.1,1500.0]],[[-694.8,-1551.0,860.0],[-381.7,-1556.1,1500.0],[-690.4,-1556.1,1500.0]],[[-690.4,-1556.1,1500.0],[-381.7,-1556.1,1500.0],[-380.0,-1560.0,2000.0]],[[-690.4,-1556.1,1500.0],[-380.0,-1560.0,2000.0],[-687.0,-1560.0,2000.0]],[[-687.0,-1560.0,2000.0],[-380.0,-1560.0,2000.0],[-380.0,-1560.0,2100.0]],[[-687.0,-1560.0,2000.0],[-380.0,-1560.0,2100.0],[-687.0,-1560.0,2100.0]],[[-687.0,-1560.0,2100.0],[-380.0,-1560.0,2100.0],[-380.0,-1560.0,2364.2]],[[-687.0,-1560.0,2100.0],[-380.0,-1560.0,2364.2],[-687.0,-1560.0,2363.8]],[[-387.7,-1545.0,-30.7],[-376.4,-806.0,-25.3],[-376.4,-806.0,100.0]],[[-387.7,-1545.0,-30.7],[-376.4,-806.0,100.0],[-387.7,-1545.0,100.0]],[[-387.7,-1545.0,100.0],[-376.4,-806.0,100.0],[-372.4,-805.0,860.0]],[[-387.7,-1545.0,100.0],[-372.4,-805.0,860.0],[-383.8,-1551.0,860.0]],[[-383.8,-1551.0,860.0],[-372.4,-805.0,860.0],[-370.1,-806.7,1500.0]],[[-383.8,-1551.0,860.0],[-370.1,-806.7,1500.0],[-381.7,-1556.1,1500.0]],[[-381.7,-1556.1,1500.0],[-370.1,-806.7,1500.0],[-368.4,-808.0,2000.0]],[[-381.7,-1556.1,1500.0],[-368.4,-808.0,2000.0],[-380.0,-1560.0,2000.0]],[[-380.0,-1560.0,2000.0],[-368.4,-808.0,2000.0],[-368.4,-808.0,2100.0]],[[-380.0,-1560.0,2000.0],[-368.4,-808.0,2100.0],[-380.0,-1560.0,2100.0]],[[-380.0,-1560.0,2100.0],[-368.4,-808.0,2100.0],[-368.4,-808.0,2365.5]],[[-380.0,-1560.0,2100.0],[-368.4,-808.0,2365.5],[-380.0,-1560.0,2364.2]],[[-376.4,-806.0,-25.3],[-12.4,-806.0,-24.3],[-12.4,-806.0,100.0]],[[-376.4,-806.0,-25.3],[-12.4,-806.0,100.0],[-376.4,-806.0,100.0]],[[-376.4,-806.0,100.0],[-12.4,-806.0,100.0],[-12.4,-805.0,860.0]],[[-376.4,-806.0,100.0],[-12.4,-805.0,860.0],[-372.4,-805.0,860.0]],[[-372.4,-805.0,860.0],[-12.4,-805.0,860.0],[-12.4,-806.7,1500.0]],[[-372.4,-805.0,860.0],[-12.4,-806.7,1500.0],[-370.1,-806.7,1500.0]],[[-370.1,-806.7,1500.0],[-12.4,-806.7,1500.0],[-12.4,-808.0,2000.0]],[[-370.1,-806.7,1500.0],[-12.4,-808.0,2000.0],[-368.4,-808.0,2000.0]],[[-368.4,-808.0,2000.0],[-12.4,-808.0,2000.0],[-12.4,-808.0,2100.0]],[[-368.4,-808.0,2000.0],[-12.4,-808.0,2100.0],[-368.4,-808.0,2100.0]],[[-368.4,-808.0,2100.0],[-12.4,-808.0,2100.0],[-12.4,-808.0,2365.6]],[[-368.4,-808.0,2100.0],[-12.4,-808.0,2365.6],[-368.4,-808.0,2365.5]],[[-12.4,-806.0,-24.3],[0.0,0.0,-20.0],[0.0,0.0,100.0]],[[-12.4,-806.0,-24.3],[0.0,0.0,100.0],[-12.4,-806.0,100.0]],[[-12.4,-806.0,100.0],[0.0,0.0,100.0],[0.0,3.0,860.0]],[[-12.4,-806.0,100.0],[0.0,3.0,860.0],[-12.4,-805.0,860.0]],[[-12.4,-805.0,860.0],[0.0,3.0,860.0],[0.0,6.6,1500.0]],[[-12.4,-805.0,860.0],[0.0,6.6,1500.0],[-12.4,-806.7,1500.0]],[[-12.4,-806.7,1500.0],[0.0,6.6,1500.0],[0.0,9.4,2000.0]],[[-12.4,-806.7,1500.0],[0.0,9.4,2000.0],[-12.4,-808.0,2000.0]],[[-12.4,-808.0,2000.0],[0.0,9.4,2000.0],[0.0,10.0,2100.0]],[[-12.4,-808.0,2000.0],[0.0,10.0,2100.0],[-12.4,-808.0,2100.0]],[[-12.4,-808.0,2100.0],[0.0,10.0,2100.0],[0.0,10.0,2365.0]],[[-12.4,-808.0,2100.0],[0.0,10.0,2365.0],[-12.4,-808.0,2365.6]]].each do |t|
  begin
    f = g.entities.add_face(t.map { |p| Geom::Point3d.new(p[0].mm, p[1].mm, p[2].mm) })
    if f then f.material = mat; f.back_material = mat end
  rescue
  end
end
g.entities.grep(Sketchup::Edge).each do |e|
  fs = e.faces
  if fs.length == 2 && fs[0].normal.angle_between(fs[1].normal) < 25.degrees
    e.soft = true; e.smooth = true
  end
end

tag = model.layers["Sciana na wprost"] || model.layers.add("Sciana na wprost")
mat = model.materials["Sciana_tylna"] || model.materials.add("Sciana_tylna")
mat.color = Sketchup::Color.new(237,234,227); mat.alpha = 1.0
g = root.entities.add_group; g.name = "Sciana_tylna"; g.layer = tag
[[[0.0,0.0,-20.0],[450.0,0.0,-16.1],[450.0,0.0,100.0]],[[0.0,0.0,-20.0],[450.0,0.0,100.0],[0.0,0.0,100.0]],[[0.0,0.0,100.0],[450.0,0.0,100.0],[450.0,10.0,860.0]],[[0.0,0.0,100.0],[450.0,10.0,860.0],[0.0,3.0,860.0]],[[0.0,3.0,860.0],[450.0,10.0,860.0],[450.0,10.0,1500.0]],[[0.0,3.0,860.0],[450.0,10.0,1500.0],[0.0,6.6,1500.0]],[[0.0,6.6,1500.0],[450.0,10.0,1500.0],[450.0,10.0,2000.0]],[[0.0,6.6,1500.0],[450.0,10.0,2000.0],[0.0,9.4,2000.0]],[[0.0,9.4,2000.0],[450.0,10.0,2000.0],[450.0,10.0,2100.0]],[[0.0,9.4,2000.0],[450.0,10.0,2100.0],[0.0,10.0,2100.0]],[[0.0,10.0,2100.0],[450.0,10.0,2100.0],[450.0,10.0,2365.2]],[[0.0,10.0,2100.0],[450.0,10.0,2365.2],[0.0,10.0,2365.0]],[[450.0,0.0,-16.1],[900.0,8.0,-13.0],[900.0,8.0,100.0]],[[450.0,0.0,-16.1],[900.0,8.0,100.0],[450.0,0.0,100.0]],[[450.0,0.0,100.0],[900.0,8.0,100.0],[900.0,10.0,860.0]],[[450.0,0.0,100.0],[900.0,10.0,860.0],[450.0,10.0,860.0]],[[450.0,10.0,860.0],[900.0,10.0,860.0],[900.0,12.6,1500.0]],[[450.0,10.0,860.0],[900.0,12.6,1500.0],[450.0,10.0,1500.0]],[[450.0,10.0,1500.0],[900.0,12.6,1500.0],[900.0,14.6,2000.0]],[[450.0,10.0,1500.0],[900.0,14.6,2000.0],[450.0,10.0,2000.0]],[[450.0,10.0,2000.0],[900.0,14.6,2000.0],[900.0,15.0,2100.0]],[[450.0,10.0,2000.0],[900.0,15.0,2100.0],[450.0,10.0,2100.0]],[[450.0,10.0,2100.0],[900.0,15.0,2100.0],[900.0,15.0,2365.0]],[[450.0,10.0,2100.0],[900.0,15.0,2365.0],[450.0,10.0,2365.2]],[[900.0,8.0,-13.0],[1350.0,8.0,-8.2],[1350.0,8.0,100.0]],[[900.0,8.0,-13.0],[1350.0,8.0,100.0],[900.0,8.0,100.0]],[[900.0,8.0,100.0],[1350.0,8.0,100.0],[1350.0,10.0,860.0]],[[900.0,8.0,100.0],[1350.0,10.0,860.0],[900.0,10.0,860.0]],[[900.0,10.0,860.0],[1350.0,10.0,860.0],[1350.0,11.0,1500.0]],[[900.0,10.0,860.0],[1350.0,11.0,1500.0],[900.0,12.6,1500.0]],[[900.0,12.6,1500.0],[1350.0,11.0,1500.0],[1350.0,11.8,2000.0]],[[900.0,12.6,1500.0],[1350.0,11.8,2000.0],[900.0,14.6,2000.0]],[[900.0,14.6,2000.0],[1350.0,11.8,2000.0],[1350.0,12.0,2100.0]],[[900.0,14.6,2000.0],[1350.0,12.0,2100.0],[900.0,15.0,2100.0]],[[900.0,15.0,2100.0],[1350.0,12.0,2100.0],[1350.0,12.0,2366.8]],[[900.0,15.0,2100.0],[1350.0,12.0,2366.8],[900.0,15.0,2365.0]],[[1350.0,8.0,-8.2],[1845.0,0.0,0.0],[1845.0,0.0,100.0]],[[1350.0,8.0,-8.2],[1845.0,0.0,100.0],[1350.0,8.0,100.0]],[[1350.0,8.0,100.0],[1845.0,0.0,100.0],[1860.0,8.0,860.0]],[[1350.0,8.0,100.0],[1860.0,8.0,860.0],[1350.0,10.0,860.0]],[[1350.0,10.0,860.0],[1860.0,8.0,860.0],[1865.0,15.7,1500.0]],[[1350.0,10.0,860.0],[1865.0,15.7,1500.0],[1350.0,11.0,1500.0]],[[1350.0,11.0,1500.0],[1865.0,15.7,1500.0],[1865.0,21.8,2000.0]],[[1350.0,11.0,1500.0],[1865.0,21.8,2000.0],[1350.0,11.8,2000.0]],[[1350.0,11.8,2000.0],[1865.0,21.8,2000.0],[1865.0,23.0,2100.0]],[[1350.0,11.8,2000.0],[1865.0,23.0,2100.0],[1350.0,12.0,2100.0]],[[1350.0,12.0,2100.0],[1865.0,23.0,2100.0],[1865.0,23.0,2370.0]],[[1350.0,12.0,2100.0],[1865.0,23.0,2370.0],[1350.0,12.0,2366.8]]].each do |t|
  begin
    f = g.entities.add_face(t.map { |p| Geom::Point3d.new(p[0].mm, p[1].mm, p[2].mm) })
    if f then f.material = mat; f.back_material = mat end
  rescue
  end
end
g.entities.grep(Sketchup::Edge).each do |e|
  fs = e.faces
  if fs.length == 2 && fs[0].normal.angle_between(fs[1].normal) < 25.degrees
    e.soft = true; e.smooth = true
  end
end

tag = model.layers["Sciana prawa"] || model.layers.add("Sciana prawa")
mat = model.materials["Sciana_prawa"] || model.materials.add("Sciana_prawa")
mat.color = Sketchup::Color.new(237,234,227); mat.alpha = 1.0
g = root.entities.add_group; g.name = "Sciana_prawa"; g.layer = tag
[[[1845.0,0.0,0.0],[1891.6,-2070.0,-5.0],[1891.6,-2070.0,100.0]],[[1845.0,0.0,0.0],[1891.6,-2070.0,100.0],[1845.0,0.0,100.0]],[[1845.0,0.0,100.0],[1891.6,-2070.0,100.0],[1907.1,-2090.0,860.0]],[[1845.0,0.0,100.0],[1907.1,-2090.0,860.0],[1860.0,8.0,860.0]],[[1860.0,8.0,860.0],[1907.1,-2090.0,860.0],[1912.1,-2090.0,1500.0]],[[1860.0,8.0,860.0],[1912.1,-2090.0,1500.0],[1865.0,15.7,1500.0]],[[1865.0,15.7,1500.0],[1912.1,-2090.0,1500.0],[1912.1,-2090.0,2000.0]],[[1865.0,15.7,1500.0],[1912.1,-2090.0,2000.0],[1865.0,21.8,2000.0]],[[1865.0,21.8,2000.0],[1912.1,-2090.0,2000.0],[1912.1,-2090.0,2100.0]],[[1865.0,21.8,2000.0],[1912.1,-2090.0,2100.0],[1865.0,23.0,2100.0]],[[1865.0,23.0,2100.0],[1912.1,-2090.0,2100.0],[1912.1,-2090.0,2363.0]],[[1865.0,23.0,2100.0],[1912.1,-2090.0,2363.0],[1865.0,23.0,2370.0]]].each do |t|
  begin
    f = g.entities.add_face(t.map { |p| Geom::Point3d.new(p[0].mm, p[1].mm, p[2].mm) })
    if f then f.material = mat; f.back_material = mat end
  rescue
  end
end
g.entities.grep(Sketchup::Edge).each do |e|
  fs = e.faces
  if fs.length == 2 && fs[0].normal.angle_between(fs[1].normal) < 25.degrees
    e.soft = true; e.smooth = true
  end
end

tag = model.layers["Obudowa GK"] || model.layers.add("Obudowa GK")
mat = model.materials["Obudowa_GK"] || model.materials.add("Obudowa_GK")
mat.color = Sketchup::Color.new(216,205,180); mat.alpha = 1.0
g = root.entities.add_group; g.name = "Obudowa_GK"; g.layer = tag
[[[1891.6,-2070.0,-5.0],[1676.6,-2070.0,-5.3],[1676.6,-2070.0,100.0]],[[1891.6,-2070.0,-5.0],[1676.6,-2070.0,100.0],[1891.6,-2070.0,100.0]],[[1891.6,-2070.0,100.0],[1676.6,-2070.0,100.0],[1692.1,-2090.0,860.0]],[[1891.6,-2070.0,100.0],[1692.1,-2090.0,860.0],[1907.1,-2090.0,860.0]],[[1907.1,-2090.0,860.0],[1692.1,-2090.0,860.0],[1697.1,-2090.0,1500.0]],[[1907.1,-2090.0,860.0],[1697.1,-2090.0,1500.0],[1912.1,-2090.0,1500.0]],[[1912.1,-2090.0,1500.0],[1697.1,-2090.0,1500.0],[1697.1,-2090.0,2000.0]],[[1912.1,-2090.0,1500.0],[1697.1,-2090.0,2000.0],[1912.1,-2090.0,2000.0]],[[1912.1,-2090.0,2000.0],[1697.1,-2090.0,2000.0],[1697.1,-2090.0,2100.0]],[[1912.1,-2090.0,2000.0],[1697.1,-2090.0,2100.0],[1912.1,-2090.0,2100.0]],[[1912.1,-2090.0,2100.0],[1697.1,-2090.0,2100.0],[1697.1,-2090.0,2363.1]],[[1912.1,-2090.0,2100.0],[1697.1,-2090.0,2363.1],[1912.1,-2090.0,2363.0]],[[1676.6,-2070.0,-5.3],[1676.6,-2195.0,-5.5],[1676.6,-2195.0,100.0]],[[1676.6,-2070.0,-5.3],[1676.6,-2195.0,100.0],[1676.6,-2070.0,100.0]],[[1676.6,-2070.0,100.0],[1676.6,-2195.0,100.0],[1692.1,-2215.0,860.0]],[[1676.6,-2070.0,100.0],[1692.1,-2215.0,860.0],[1692.1,-2090.0,860.0]],[[1692.1,-2090.0,860.0],[1692.1,-2215.0,860.0],[1697.1,-2215.0,1500.0]],[[1692.1,-2090.0,860.0],[1697.1,-2215.0,1500.0],[1697.1,-2090.0,1500.0]],[[1697.1,-2090.0,1500.0],[1697.1,-2215.0,1500.0],[1697.1,-2215.0,2000.0]],[[1697.1,-2090.0,1500.0],[1697.1,-2215.0,2000.0],[1697.1,-2090.0,2000.0]],[[1697.1,-2090.0,2000.0],[1697.1,-2215.0,2000.0],[1697.1,-2215.0,2100.0]],[[1697.1,-2090.0,2000.0],[1697.1,-2215.0,2100.0],[1697.1,-2090.0,2100.0]],[[1697.1,-2090.0,2100.0],[1697.1,-2215.0,2100.0],[1697.1,-2215.0,2363.2]],[[1697.1,-2090.0,2100.0],[1697.1,-2215.0,2363.2],[1697.1,-2090.0,2363.1]],[[1676.6,-2195.0,-5.5],[1894.4,-2195.0,-5.2],[1894.4,-2195.0,100.0]],[[1676.6,-2195.0,-5.5],[1894.4,-2195.0,100.0],[1676.6,-2195.0,100.0]],[[1676.6,-2195.0,100.0],[1894.4,-2195.0,100.0],[1909.9,-2215.0,860.0]],[[1676.6,-2195.0,100.0],[1909.9,-2215.0,860.0],[1692.1,-2215.0,860.0]],[[1692.1,-2215.0,860.0],[1909.9,-2215.0,860.0],[1914.9,-2215.0,1500.0]],[[1692.1,-2215.0,860.0],[1914.9,-2215.0,1500.0],[1697.1,-2215.0,1500.0]],[[1697.1,-2215.0,1500.0],[1914.9,-2215.0,1500.0],[1914.9,-2215.0,2000.0]],[[1697.1,-2215.0,1500.0],[1914.9,-2215.0,2000.0],[1697.1,-2215.0,2000.0]],[[1697.1,-2215.0,2000.0],[1914.9,-2215.0,2000.0],[1914.9,-2215.0,2100.0]],[[1697.1,-2215.0,2000.0],[1914.9,-2215.0,2100.0],[1697.1,-2215.0,2100.0]],[[1697.1,-2215.0,2100.0],[1914.9,-2215.0,2100.0],[1914.9,-2215.0,2363.1]],[[1697.1,-2215.0,2100.0],[1914.9,-2215.0,2363.1],[1697.1,-2215.0,2363.2]]].each do |t|
  begin
    f = g.entities.add_face(t.map { |p| Geom::Point3d.new(p[0].mm, p[1].mm, p[2].mm) })
    if f then f.material = mat; f.back_material = mat end
  rescue
  end
end
g.entities.grep(Sketchup::Edge).each do |e|
  fs = e.faces
  if fs.length == 2 && fs[0].normal.angle_between(fs[1].normal) < 25.degrees
    e.soft = true; e.smooth = true
  end
end

tag = model.layers["Podloga"] || model.layers.add("Podloga")
mat = model.materials["Podloga"] || model.materials.add("Podloga")
mat.color = Sketchup::Color.new(200,183,158); mat.alpha = 1.0
g = root.entities.add_group; g.name = "Podloga"; g.layer = tag
[[[1894.4,-2195.0,-5.2],[-697.7,-1545.0,-31.2],[-707.5,-2180.0,-32.2]],[[1894.4,-2195.0,-5.2],[-387.7,-1545.0,-30.7],[-697.7,-1545.0,-31.2]],[[-387.7,-1545.0,-30.7],[-12.4,-806.0,-24.3],[-376.4,-806.0,-25.3]],[[-12.4,-806.0,-24.3],[450.0,0.0,-16.1],[0.0,0.0,-20.0]],[[-387.7,-1545.0,-30.7],[450.0,0.0,-16.1],[-12.4,-806.0,-24.3]],[[-387.7,-1545.0,-30.7],[900.0,8.0,-13.0],[450.0,0.0,-16.1]],[[-387.7,-1545.0,-30.7],[1350.0,8.0,-8.2],[900.0,8.0,-13.0]],[[-387.7,-1545.0,-30.7],[1845.0,0.0,0.0],[1350.0,8.0,-8.2]],[[-387.7,-1545.0,-30.7],[1891.6,-2070.0,-5.0],[1845.0,0.0,0.0]],[[-387.7,-1545.0,-30.7],[1676.6,-2070.0,-5.3],[1891.6,-2070.0,-5.0]],[[1894.4,-2195.0,-5.2],[1676.6,-2070.0,-5.3],[-387.7,-1545.0,-30.7]],[[1676.6,-2070.0,-5.3],[1676.6,-2195.0,-5.5],[1894.4,-2195.0,-5.2]]].each do |t|
  begin
    f = g.entities.add_face(t.map { |p| Geom::Point3d.new(p[0].mm, p[1].mm, p[2].mm) })
    if f then f.material = mat; f.back_material = mat end
  rescue
  end
end
g.entities.grep(Sketchup::Edge).each do |e|
  fs = e.faces
  if fs.length == 2 && fs[0].normal.angle_between(fs[1].normal) < 25.degrees
    e.soft = true; e.smooth = true
  end
end

tag = model.layers["Sufit"] || model.layers.add("Sufit")
mat = model.materials["Sufit"] || model.materials.add("Sufit")
mat.color = Sketchup::Color.new(247,247,247); mat.alpha = 1.0
g = root.entities.add_group; g.name = "Sufit"; g.layer = tag
[[[1914.9,-2215.0,2363.1],[-696.7,-2192.0,2363.5],[-687.0,-1560.0,2363.8]],[[1914.9,-2215.0,2363.1],[-687.0,-1560.0,2363.8],[-380.0,-1560.0,2364.2]],[[-380.0,-1560.0,2364.2],[-368.4,-808.0,2365.5],[-12.4,-808.0,2365.6]],[[-12.4,-808.0,2365.6],[0.0,10.0,2365.0],[450.0,10.0,2365.2]],[[-380.0,-1560.0,2364.2],[-12.4,-808.0,2365.6],[450.0,10.0,2365.2]],[[-380.0,-1560.0,2364.2],[450.0,10.0,2365.2],[900.0,15.0,2365.0]],[[-380.0,-1560.0,2364.2],[900.0,15.0,2365.0],[1350.0,12.0,2366.8]],[[-380.0,-1560.0,2364.2],[1350.0,12.0,2366.8],[1865.0,23.0,2370.0]],[[-380.0,-1560.0,2364.2],[1865.0,23.0,2370.0],[1912.1,-2090.0,2363.0]],[[-380.0,-1560.0,2364.2],[1912.1,-2090.0,2363.0],[1697.1,-2090.0,2363.1]],[[1914.9,-2215.0,2363.1],[-380.0,-1560.0,2364.2],[1697.1,-2090.0,2363.1]],[[1697.1,-2090.0,2363.1],[1914.9,-2215.0,2363.1],[1697.1,-2215.0,2363.2]]].each do |t|
  begin
    f = g.entities.add_face(t.map { |p| Geom::Point3d.new(p[0].mm, p[1].mm, p[2].mm) })
    if f then f.material = mat; f.back_material = mat end
  rescue
  end
end
g.entities.grep(Sketchup::Edge).each do |e|
  fs = e.faces
  if fs.length == 2 && fs[0].normal.angle_between(fs[1].normal) < 25.degrees
    e.soft = true; e.smooth = true
  end
end

tag = model.layers["Okno"] || model.layers.add("Okno")
mat = model.materials["Okno_gora_do_zmierzenia"] || model.materials.add("Okno_gora_do_zmierzenia")
mat.color = Sketchup::Color.new(156,195,230); mat.alpha = 0.5
g = root.entities.add_group; g.name = "Okno_gora_do_zmierzenia"; g.layer = tag
[[[1873.4,-460.0,1135.0],[1910.0,-2085.0,1135.0],[1910.0,-2085.0,2135.0]],[[1873.4,-460.0,1135.0],[1910.0,-2085.0,2135.0],[1873.4,-460.0,2135.0]]].each do |t|
  begin
    f = g.entities.add_face(t.map { |p| Geom::Point3d.new(p[0].mm, p[1].mm, p[2].mm) })
    if f then f.material = mat; f.back_material = mat end
  rescue
  end
end
g.entities.grep(Sketchup::Edge).each do |e|
  fs = e.faces
  if fs.length == 2 && fs[0].normal.angle_between(fs[1].normal) < 25.degrees
    e.soft = true; e.smooth = true
  end
end

tag = model.layers["Okno"] || model.layers.add("Okno")
mat = model.materials["Parapet"] || model.materials.add("Parapet")
mat.color = Sketchup::Color.new(250,250,250); mat.alpha = 1.0
g = root.entities.add_group; g.name = "Parapet"; g.layer = tag
[[[1840.4,-460.0,1135.0],[1877.0,-2085.0,1115.0],[1877.0,-2085.0,1135.0]],[[1840.4,-460.0,1135.0],[1840.4,-460.0,1115.0],[1877.0,-2085.0,1115.0]],[[1840.4,-460.0,1135.0],[1877.0,-2085.0,1135.0],[1912.0,-2085.0,1135.0]],[[1840.4,-460.0,1135.0],[1912.0,-2085.0,1135.0],[1875.4,-460.0,1135.0]]].each do |t|
  begin
    f = g.entities.add_face(t.map { |p| Geom::Point3d.new(p[0].mm, p[1].mm, p[2].mm) })
    if f then f.material = mat; f.back_material = mat end
  rescue
  end
end
g.entities.grep(Sketchup::Edge).each do |e|
  fs = e.faces
  if fs.length == 2 && fs[0].normal.angle_between(fs[1].normal) < 25.degrees
    e.soft = true; e.smooth = true
  end
end
model.commit_operation
puts "Gotowe: model kuchni wczytany."

# ---- gotowa podloga: panel 8 mm + podklad 3 mm = 11 mm nad wylewka ----
model = Sketchup.active_model
model.start_operation("Podloga gotowa", true)
ftag = model.layers["Podloga gotowa (panele 11 mm)"] || model.layers.add("Podloga gotowa (panele 11 mm)")
fmat = model.materials["Panele_podlogowe"] || model.materials.add("Panele_podlogowe")
fmat.color = Sketchup::Color.new(190, 160, 120)
fg = model.active_entities.add_group; fg.name = "Podloga_gotowa_11mm"; fg.layer = ftag
[[[1894.4,-2195.0,5.8],[-697.7,-1545.0,-20.2],[-707.5,-2180.0,-21.2]],[[1894.4,-2195.0,5.8],[-387.7,-1545.0,-19.7],[-697.7,-1545.0,-20.2]],[[-387.7,-1545.0,-19.7],[-12.4,-806.0,-13.3],[-376.4,-806.0,-14.3]],[[-12.4,-806.0,-13.3],[450.0,0.0,-5.1],[0.0,0.0,-9.0]],[[-387.7,-1545.0,-19.7],[450.0,0.0,-5.1],[-12.4,-806.0,-13.3]],[[-387.7,-1545.0,-19.7],[900.0,8.0,-2.0],[450.0,0.0,-5.1]],[[-387.7,-1545.0,-19.7],[1350.0,8.0,2.8],[900.0,8.0,-2.0]],[[-387.7,-1545.0,-19.7],[1845.0,0.0,11.0],[1350.0,8.0,2.8]],[[-387.7,-1545.0,-19.7],[1891.6,-2070.0,6.0],[1845.0,0.0,11.0]],[[-387.7,-1545.0,-19.7],[1676.6,-2070.0,5.7],[1891.6,-2070.0,6.0]],[[1894.4,-2195.0,5.8],[1676.6,-2070.0,5.7],[-387.7,-1545.0,-19.7]],[[1676.6,-2070.0,5.7],[1676.6,-2195.0,5.5],[1894.4,-2195.0,5.8]]].each do |t|
  begin
    f = fg.entities.add_face(t.map { |p| Geom::Point3d.new(p[0].mm, p[1].mm, p[2].mm) })
    if f then f.reverse! if f.normal.z < 0; f.material = fmat end
  rescue
  end
end
fg.entities.grep(Sketchup::Edge).each { |e| e.soft = e.smooth = true if e.faces.length == 2 }
model.commit_operation

$kuchnia_zoff = 11
# Kuchnia - meble v33 (uchwyty: szuflady + zmywarka 190 mm, drzwi/klapy 32 mm, czarne) (wymiary ze schematu, mm). Uruchom w Konsoli Ruby SketchUpa:
#   load File.expand_path('~/Downloads/kuchnia-meble.rb')
# WYSOKOSCI: z = 0 to GOTOWA podloga (panel 8 + podklad 3 = 11 mm) w najwyzszym punkcie (prawy narozenik).
# Sufit nad gotowa podloga ok. 2352 (pomiar 2363-2370 minus 11). Plyty "do sufitu" maja dol na lokalnej
# wysokosci podlogi (podloga opada do -35) i gore na 2352 - zamow je ok. 20-30 mm dluzsze i dotnij na miejscu.
# Kazda szafka to osobna grupa, kazda plyta w srodku to osobna grupa (gotowe pod OpenCutList).
# Kazdy front, blat, element AGD, okladzina i korpus ma wlasny znacznik (pogrupowane w folderach).

M = Sketchup.active_model
M.start_operation("Kuchnia meble v33", true)

def mat(name, rgb, a = 1.0)
  m = M.materials[name] || M.materials.add(name)
  m.color = Sketchup::Color.new(*rgb)
  m.alpha = a
  m
end

KORPUS = mat("Korpus_kaszmir",   [214, 202, 186])
FRONT  = mat("Front_kaszmir",    [205, 191, 174])
UCH    = mat("Uchwyt_czarny (okucie, nie ciac)", [22, 22, 24])
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
ROOT.name  = "Kuchnia_meble_v33"
ROOT.layer = tg("Kuchnia", "Kuchnia - meble (calosc)")

# ---- oklejanie: krawedzie BEZ okleiny maluje na brazowo (RAW), oklejone zostaja w kolorze plyty ----
def band_rule(name)
  case name
  when /AGD|Zlew|Bateria|Plyta indukcyjna|Nozka|Stopka|Klips|Merivobox|Uchwyt/ then :skip
  when /Druga plyta dolna/ then [:top, :front, :back]
  when /Plecy HDF|Klocek|Poprzeczka|Pasek|Cokol|Dno 16mm|Okladzina lewej|Plyta nad blatem|Plyta za zlewem/ then []
  when /Tyl 16mm/ then [:top]
  when /Dno blendy/ then [:front]
  when /G1 Blenda/ then [:right, :top, :bottom]
  when /G5 Blenda/ then [:left, :top, :bottom]
  when /G6 Blenda|L7 Blenda/ then [:bottom]
  when /Front|Drzwi|Szuflada|Blenda|Klapa/ then :all
  when /Bok lodowki/ then [:left, :right]          # przod i tyl oklejone (bok wystaje poza sciane); gora/dol docinasz
  when /Plyta bok wneki|L3 Wieniec|L4 Wieniec/ then [:right]
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
def wpoly(name, pts, z0, z1, m, layer = nil, ents = ROOT.entities)
  g = ents.add_group
  g.name = name
  f = g.entities.add_face(pts.map { |x, y| Geom::Point3d.new(x.mm, -y.mm, z0.mm) })
  f.reverse! if f.normal.z < 0
  f.pushpull((z1 - z0).mm)
  g.material = m
  g.layer = layer if layer
  xs = pts.map(&:first); ys = pts.map(&:last)
  apply_band(g, name, true, [xs.max - xs.min, ys.max - ys.min, (z1 - z0).abs])
  g
end
# plyta stojaca w plaszczyznie y-z (profil [y, z]), grubosc w osi x od x0 do x1
def wxprof(name, x0, x1, pts, m, layer = nil, ents = ROOT.entities)
  g = ents.add_group
  g.name = name
  f = g.entities.add_face(pts.map { |y, z| Geom::Point3d.new(x0.mm, -y.mm, z.mm) })
  f.reverse! if f.normal.x < 0
  f.pushpull((x1 - x0).mm)
  g.material = m
  g.layer = layer if layer
  ys = pts.map(&:first); zs = pts.map(&:last)
  apply_band(g, name, true, [(x1 - x0).abs, ys.max - ys.min, zs.max - zs.min])
  g
end
def wbox(name, x0, x1, y0, y1, z0, z1, m, layer = nil, ents = ROOT.entities)
  box(ents, name, x0, x1, -y1, -y0, z0, z1, m, layer, true)
end

# ---- podloga z pomiarow (wzgledem gotowej podlogi w prawym narozniku): te same trojkaty co w modelu pomieszczenia ----
FLOOR_TRIS = [[[1894.4,2195.0,-5.2],[-697.7,1545.0,-31.2],[-707.5,2180.0,-32.2]],[[1894.4,2195.0,-5.2],[-387.7,1545.0,-30.7],[-697.7,1545.0,-31.2]],[[-387.7,1545.0,-30.7],[-12.4,806.0,-24.3],[-376.4,806.0,-25.3]],[[-12.4,806.0,-24.3],[450.0,0.0,-16.1],[0.0,0.0,-20.0]],[[-387.7,1545.0,-30.7],[450.0,0.0,-16.1],[-12.4,806.0,-24.3]],[[-387.7,1545.0,-30.7],[900.0,-8.0,-13.0],[450.0,0.0,-16.1]],[[-387.7,1545.0,-30.7],[1350.0,-8.0,-8.2],[900.0,-8.0,-13.0]],[[-387.7,1545.0,-30.7],[1845.0,0.0,0.0],[1350.0,-8.0,-8.2]],[[-387.7,1545.0,-30.7],[1891.6,2070.0,-5.0],[1845.0,0.0,0.0]],[[-387.7,1545.0,-30.7],[1676.6,2070.0,-5.3],[1891.6,2070.0,-5.0]],[[1894.4,2195.0,-5.2],[1676.6,2070.0,-5.3],[-387.7,1545.0,-30.7]],[[1676.6,2070.0,-5.3],[1676.6,2195.0,-5.5],[1894.4,2195.0,-5.2]]]
FLOOR_PTS = [[0, 0, -20], [900, 0, -13], [1845, 0, 0], [1845, 1000, -2], [1845, 2070, -5], [-180, 1175, -28], [-500, 1860, -35]]
def floor_z(x, y)
  FLOOR_TRIS.each do |a, b, c|
    d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    next if d.abs < 1e-6
    l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d
    l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d
    l3 = 1 - l1 - l2
    return l1 * a[2] + l2 * b[2] + l3 * c[2] if l1 >= -0.01 && l2 >= -0.01 && l3 >= -0.01
  end
  num = 0.0; den = 0.0
  FLOOR_PTS.each { |px, py, v| dd = Math.hypot(x - px, y - py); return v if dd < 1; w = 1 / dd**2; num += w * v; den += w }
  num / den
end
def floor_min(x0, x1, y0, y1)
  [x0, (x0 + x1) / 2.0, x1].product([y0, (y0 + y1) / 2.0, y1]).map { |x, y| floor_z(x, y) }.min.round
end
NAD = 20   # naddatek do dociecia przy scianie / suficie / podlodze
def floor_max(x0, x1, y0, y1)
  [x0, (x0 + x1) / 2.0, x1].product([y0, (y0 + y1) / 2.0, y1]).map { |x, y| floor_z(x, y) }.max.round
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
    box(e, "#{p} Bok P #{h - T}x#{d}", w - T, w, 0, d, T, h, KORPUS, l) unless opts[:bez_boku_p]
  end
  if opts[:bez_trawersow]
    # brak trawersow - gore spina osobny wieniec (np. B3: panel pod plyta indukcyjna)
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

# ---- uchwyty czarne: 190 mm (szuflady, zmywarka) i maly 32 mm (drzwi, klapy). x, z = srodek uchwytu ----
def uchwyt_maly(e, p, x, z, d)
  box(e, "#{p} Uchwyt czarny maly 32 mm", x - 16, x + 16, d + T, d + T + 25, z - 6, z + 6, UCH, tg("Uchwyty", "Uchwyty #{p}"))
end
def uchwyt_19(e, p, x, z, d)
  l = tg("Uchwyty", "Uchwyty #{p}")
  box(e, "#{p} Uchwyt czarny 190 mm", x - 95, x + 95, d + T + 22, d + T + 32, z - 6, z + 6, UCH, l)
  [x - 80, x + 80].each { |xx| box(e, "#{p} Uchwyt czarny 190 mm (wspornik)", xx - 5, xx + 5, d + T, d + T + 22, z - 5, z + 5, UCH, l) }
end

# szuflada Merivobox: boki stalowe (okucie), dno i tyl z plyty 16 mm.
# Wymiary dna/tylu orientacyjne: szer. = szer. wewnetrzna - 51, dl. dna = NL - 10. SPRAWDZ w Blum E-SERVICES.
SIDE_H = { "N" => 68.5, "M" => 91, "K" => 129, "E" => 192 }
def szuflada(e, p, label, w, d, z0, typ, nl = 500)
  l  = tg("Szuflady", "Szuflady #{p}")
  sh = SIDE_H[typ]
  bw = w - 2 * T - 51
  x0 = T + 25.5
  y1 = d - 10; y0 = y1 - (nl - 10)
  box(e, "#{p} #{label} Dno 16mm #{bw.round}x#{nl - 10}", x0, x0 + bw, y0, y1, z0, z0 + 16, DNO16, l)
  box(e, "#{p} #{label} Tyl 16mm #{bw.round}x#{(sh - 20).round}", x0, x0 + bw, y0, y0 + 16, z0 + 16, z0 + sh - 4, DNO16, l)
  box(e, "#{p} #{label} Bok L Merivobox #{typ}", x0 - 13, x0, y0, y1, z0, z0 + sh, STAL, l)
  box(e, "#{p} #{label} Bok P Merivobox #{typ}", x0 + bw, x0 + bw + 13, y0, y1, z0, z0 + sh, STAL, l)
end

# nozki regulowane 100 mm (rura ~35 mm, stopka ~70 mm) + klipsy cokolu wciskane na rure.
# Przednie nozki: os 25 mm za tylna sciana cokolu (cokol cofniety 40 mm od frontu, plyta 18).
def nozki(e, p, w, d)
  l  = tg("Nozki i klipsy", "Nozki #{p}")
  xs = w < 200 ? [w / 2.0] : (w >= 800 ? [50, w / 2.0, w - 50] : [50, w - 50])
  yf = d - 65; yb = 60
  xs.each do |x|
    [yf, yb].each do |y|
      wp = $cur_t * Geom::Point3d.new(x.mm, y.mm, 0)
      fz = floor_z(wp.x.to_mm, -wp.y.to_mm)
      zb = fz - LEG                                   # spod stopki w ukladzie korpusu
      lh = (-zb).round
      box(e, "#{p} Nozka #{lh} (os x=#{x.round} y=#{y.round} od lewego-tylnego naroza korpusu)", x - 17, x + 17, y - 17, y + 17, zb + 5, 0, NOZKA, l)
      box(e, "#{p} Stopka nozki", x - 35, x + 35, y - 35, y + 35, zb, zb + 5, NOZKA, l)
    end
    box(e, "#{p} Klips cokolu", x - 15, x + 15, yf + 17, d - 40, -70, -30, NOZKA, l)
  end
end

CEIL = 2352
LEG = 100; KH = 720; KD = 510; TOPZ = LEG + KH          # korpus 100..820, blat 820..858
UPB = 1408; UPH = 900; UD = 332                           # wiszace 1408..2308
BR = [-1, 0, 0]; BRY = [0, -1, 0]                         # osie: ciag pod sciana na wprost
RL = [0, 1, 0];  RLY = [-1, 0, 0]                         # osie: Elka pod prawa sciana
NI = [0, -1, 0]; NIY = [1, 0, 0]                          # osie: wneka zlewu
BLC = "Blendy i cokoly"

# ---------- SCIANA NA WPROST (dol) ----------
LM = "Listwy montazowe"
# B1: otwierana blenda (drzwiczki 127) na zawiasach Blum CLIP top BLUMOTION 155 st. (szerokie otwarcie), mocowanych do slupka B0.
# Slupek B0 to tez bok dla zmywarki (do niego mocujesz zmywarke) i podpora blatu.
# B1: waski korpus 127 przy zmywarce (bez plecow - dostep do wody i odplywu zmywarki).
# W lewym boku i w okladzinie wytniesz na miejscu otwory na zawor i odplyw.
cabinet("B1 Korpus przy zmywarce 127", [145, -50, LEG], BR, BRY) do |e|
  korpus(e, "B1", 127, KD, KH, bez_plecow: true)
  # drzwiczki zwezone z lewej o 18 mm - obok stoi druga plyta przy rurach (inaczej zahaczalyby przy otwieraniu)
  front(e, "B1", "Drzwiczki (zawiasy od strony zmywarki, Blum 155 st.)", KD, 2, 107, 2, 718)
  uchwyt_maly(e, "B1", 72, 668, KD)                          # przy krawedzi bez zawiasow, u gory
  nozki(e, "B1", 127, KD)
end
# Electrolux EEA71210L: 446 x 818-898 x 550 (nisza min. 820 wys., 550 gl.); woda/odplyw przez bok B1
wbox("B2 Zmywarka 446x550 wys. 818-898 (AGD)", 147, 593, 10, 560, floor_max(147, 593, 10, 560), TOPZ - 2, AGD, tg("AGD", "AGD Zmywarka"))
wbox("B2 Zmywarka Front 446x716", 147, 593, 560, 578, LEG + 2, TOPZ - 2, FRONT, tg("Fronty", "Front B2 Zmywarka"))
# uchwyt zmywarki 190 mm - w jednej linii z gornymi szufladami P2/P3
wbox("B2 Uchwyt czarny 190 mm", 275, 465, 600, 610, LEG + 667, LEG + 679, UCH, tg("Uchwyty", "Uchwyty B2"))
[290, 450].each { |xx| wbox("B2 Uchwyt czarny 190 mm (wspornik)", xx - 5, xx + 5, 578, 600, LEG + 668, LEG + 678, UCH, tg("Uchwyty", "Uchwyty B2")) }
# Amica ED376191B: front 595x595, korpus ~560 szer. x 578 wys., gl. 550 za frontem (razem 570); z tylu 40 mm na wentylacje.
# Plyta Samsung NZ64F3NM1AB: korpus siega ok. 52 mm pod wierzch blatu (lokalnie z = 706).
# Uklad (od dolu): schowek 60 mm z klapa opadana na zawiasach -> polka 16 mm -> piekarnik -> 34 mm luzu pod plyta -> blenda 35 mm.
# Bez trawersow i bez plecow: gore spina blat (katowniki do bokow), blenda gorna na katownikach.
# Kazdy mm schowka = mm blendy gornej (przesuwasz polke i piekarnik razem).
cabinet("B3 Piekarnik 600", [1195, -50, LEG], BR, BRY) do |e|
  l = tg("Korpusy", "Korpus B3")
  korpus(e, "B3", 600, KD, KH, bez_plecow: true, bez_trawersow: true)
  box(e, "B3 Polka pod piekarnik (plyta 16mm) #{600 - 2 * T}x#{KD - 40} (40 mm szczeliny z tylu - wentylacja)", T, 600 - T, 40, KD, 78, 94, DNO16, l)
  pa = tg("AGD", "AGD Piekarnik")
  box(e, "B3 Piekarnik korpus 560x578x550 (AGD)", 20, 580, -40, KD, 94, 672, AGD, pa)
  box(e, "B3 Piekarnik front 595x595 (AGD)", 2.5, 597.5, KD, KD + 20, 86, 681, AGD, pa)
  front(e, "B3", "Klapa schowka (2 zawiasy na dole, otwiera sie w dol)", KD, 2, 598, 2, 84)
  uchwyt_maly(e, "B3", 300, 43, KD)                          # klapa: na srodku
  front(e, "B3", "Blenda nad piekarnikiem (na katownikach do bokow)", KD, 2, 598, 683, 718)
  nozki(e, "B3", 600, KD)
end
# ELKA: korpusy 505 gl. (szuflady Merivobox NL 500 zostaja), przesuniete 40 mm do prawej sciany,
# blat Elki 600 wystaje 15 mm przed fronty. Przy narozniku za P1 zostaje ok. 7 mm do sciany (sprawdz na wys. blatu!).
EKD = 505
EX = 1835                                   # tyl szafek Elki (bylo 1795)
EF = EX - EKD                               # przod korpusow Elki 1330
B4W = EF - 1195                             # szerokosc B4 = od boku B3 do przodu P1 = 135
# B4: maly korpus (lewy bok + dno + trawers), otwarty z prawej strony do narozenika P1.
# Tyl B4 zamyka przedluzony bok tylny P1 (jeden kawalek od narozenika az do boku B3).
# Montaz: najpierw P1, potem dno B4 lacznikiem plaskim do wienca P1 i od spodu do boku tylnego P1,
# bok B4 skrecasz z bokiem B3, trawers katownikiem do trawersu P1.
cabinet("B4 Korpus narozny U #{B4W}", [EF, -50, LEG], BR, BRY) do |e|
  l = tg("Korpusy", "Korpus B4")
  box(e, "B4 Wieniec dolny (pod bokiem i plecami) #{B4W}x#{KD} (prawa krawedz: lacznik plaski do wienca P1)", 0, B4W, 0, KD, 0, T, KORPUS, l)
  box(e, "B4 Bok L #{KH - T}x#{KD - T} (skrec z bokiem B3, tu zawiasy drzwiczek)", B4W - T, B4W, T, KD, T, KH, KORPUS, l)
  box(e, "B4 Trawers przod #{B4W - T}x100 (prawy koniec: katownik do trawersu P1)", 0, B4W - T, KD - 100, KD, KH - T, KH, KORPUS, l)
  front(e, "B4", "Drzwiczki narozne (zawiasy Blum 155 st. na boku B4, otw. w lewo, chowaja sie za drzwiami P1)", KD, 3, B4W - 1, 2, 718)
  uchwyt_maly(e, "B4", 38, 668, KD)
  nozki(e, "B4", B4W, KD)
end

# ---------- ELKA (prawa sciana) ----------
cabinet("P1 Narozna 900 (drzwi 367)", [EX, -950, LEG], RL, RLY) do |e|
  korpus(e, "P1", 900, EKD, KH, bez_boku_p: true)
  # bok przy scianie na wprost: jeden kawalek od narozenika do boku B3 (zamyka tez tyl B4); stoi na wiencu P1 i dnie B4
  box(e, "P1 Bok tylny przy scianie #{KH - T}x#{EX - 1195} (jeden kawalek do boku B3, zamyka tyl B4)", 900 - T, 900, 0, EX - 1195, T, KH, KORPUS, tg("Korpusy", "Korpus P1"))
  polka(e, "P1", 900, EKD - 20, 340)
  front(e, "P1", "Drzwi (zawiasy Blum 155 st. od szuflad, otw. w prawo, otwierasz PIERWSZE)", EKD, 2, 369, 2, 718)
  uchwyt_maly(e, "P1", 334, 668, EKD)
  nozki(e, "P1", 900, EKD)
end
cabinet("P2 Szuflady 600", [EX, -1550, LEG], RL, RLY) do |e|
  korpus(e, "P2", 600, EKD, KH)
  front(e, "P2", "Szuflada dolna (E + galeria)", EKD, 2, 598, 2, 322)
  front(e, "P2", "Szuflada srodkowa (K)", EKD, 2, 598, 325, 575)
  front(e, "P2", "Szuflada gorna (M, sztucce)", EKD, 2, 598, 578, 718)
  [277, 530, 673].each { |z| uchwyt_19(e, "P2", 300, z, EKD) }   # 45 mm pod gorna krawedzia kazdej szuflady
  nozki(e, "P2", 600, EKD)
  szuflada(e, "P2", "Szuflada dolna", 600, EKD, 33, "E")
  szuflada(e, "P2", "Szuflada srodkowa", 600, EKD, 350, "K")
  szuflada(e, "P2", "Szuflada gorna", 600, EKD, 603, "M")
end
cabinet("P3 Szuflady 500", [EX, -2050, LEG], RL, RLY) do |e|
  korpus(e, "P3", 500, EKD, KH)
  front(e, "P3", "Szuflada dolna (E + galeria)", EKD, 2, 498, 2, 322)
  front(e, "P3", "Szuflada srodkowa (K)", EKD, 2, 498, 325, 575)
  front(e, "P3", "Szuflada gorna (M, sztucce)", EKD, 2, 498, 578, 718)
  [277, 530, 673].each { |z| uchwyt_19(e, "P3", 250, z, EKD) }
  nozki(e, "P3", 500, EKD)
  szuflada(e, "P3", "Szuflada dolna", 500, EKD, 33, "E")
  szuflada(e, "P3", "Szuflada srodkowa", 500, EKD, 350, "K")
  szuflada(e, "P3", "Szuflada gorna", 500, EKD, 603, "M")
end
EFF = EF - T                                # lico frontow Elki 1312
zb = floor_min(EFF, 1920, 2050, 2068) - 10
wbox("P4 Bok ozdobny #{1920 - EFF}x#{(TOPZ - zb).round} (z naddatkiem do sciany i podlogi, dotnij)", EFF, 1920, 2050, 2068, zb, TOPZ, DREWNO, tg("Okladziny", "Okladzina bok ozdobny Elki"))

# ---------- COKOLY ----------
zb = floor_min(18, EFF + 40, 520, 538) - 5
wbox("Cokol sciana na wprost #{EFF + 40 - 18} wys. #{(LEG - zb).round} (z naddatkiem, dotnij do podlogi)", 18, EFF + 40, 520, 538, zb, LEG, FRONT, tg(BLC, "Cokol sciana na wprost"))
zb = floor_min(EFF + 40, EFF + 58, 520, 2050) - 5
wbox("Cokol Elka #{2050 - 520} wys. #{(LEG - zb).round} (z naddatkiem, dotnij do podlogi)", EFF + 40, EFF + 58, 520, 2050, zb, LEG, FRONT, tg(BLC, "Cokol Elka"))
zb = floor_min(-40, -22, 824, 1560) - 5
wbox("Cokol zlew 736 wys. #{(LEG - zb).round} (z naddatkiem, dotnij do podlogi)", -22, -4, 824, 1560, zb, LEG, FRONT, tg(BLC, "Cokol zlew"))

# ---------- BLATY ----------
wbox("Blat sciana na wprost 1857x600 (z naddatkiem do prawej sciany)", 18, 1875, 0, 600, TOPZ, TOPZ + 38, DREWNO, tg("Blaty", "Blat sciana na wprost"))
# blat Elki ze zwyklego blatu 600: wystaje 15 mm przed fronty; od sciany docinasz po skosie (ok. 548 przy narozniku, ok. 594 na koncu)
wbox("Blat Elka 600x1468 (dotnij po skosie do krzywej prawej sciany)", EFF - 15, EFF - 15 + 600, 600, 2068, TOPZ, TOPZ + 38, DREWNO, tg("Blaty", "Blat Elka"))
# szafka zlewowa, blat i zlew wysuniete o 18 mm - fronty na rowno z druga plyta przy rurach (lico x = 36)
wbox("Blat zlew 736x421 (z naddatkiem do tylu wneki)", -385, 36, 824, 1560, TOPZ, TOPZ + 38, DREWNO, tg("Blaty", "Blat zlew"))
# ZLEW 500x280 (komora 390x240), wzdluz wneki; wyciecie w blacie wg szablonu producenta
zl = tg("AGD", "AGD Zlew")
wbox("Zlew rant 500x280 (wyciecie wg szablonu)", -284, -4, 935, 1435, TOPZ + 38, TOPZ + 41, ZLEW, zl)
wbox("Zlew komora 390x240 gl. ~170", -264, -24, 1035, 1425, TOPZ + 38 - 170, TOPZ + 38, ZLEW, zl)
wbox("Bateria (miejsce)", -164, -124, 965, 1005, TOPZ + 41, TOPZ + 300, ZLEW, zl)
# PLYTA INDUKCYJNA Samsung NZ64F3NM1AB: 590x520x57, wyciecie 560x490 (+1..+4), 50 mm od przedniej krawedzi blatu.
# Blat max 32 mm wg instrukcji - nasz ma 38: od spodu wokol wyciecia sfrezuj ok. 6 mm pod wsporniki (albo dluzsze sruby).
ip = tg("AGD", "AGD Plyta indukcyjna")
wbox("Plyta indukcyjna szklo 590x520", 600, 1190, 45, 565, TOPZ + 38, TOPZ + 43, ZLEW, ip)
wbox("Plyta indukcyjna korpus pod blatem 560x490 (wyciecie 50 od frontu blatu)", 615, 1175, 60, 550, TOPZ + 38 - 52, TOPZ + 38, AGD, ip)

# ---------- WISZACE ----------
wbox("G1 Blenda L 127", 18, 145, UD, UD + T, UPB + 2, UPB + UPH - 2, FRONT, tg(BLC, "Blenda G1 lewa gora"))
cabinet("G2 Wiszaca 450", [595, 0, UPB], BR, BRY) do |e|
  korpus(e, "G2", 450, UD, UPH, wieniec_gorny: true)
  polka(e, "G2", 450, UD - 20, 450)
  front(e, "G2", "Drzwi (zawiasy L)", UD, 2, 448, 2, UPH - 2)
  uchwyt_maly(e, "G2", 37, 52, UD)                            # wiszace: na dole, od strony bez zawiasow
end
cabinet("G3 Wiszaca 600 (okap w dnie)", [1195, 0, UPB], BR, BRY) do |e|
  korpus(e, "G3", 600, UD, UPH, wieniec_gorny: true)
  # Okap Gotze & Jensen BH100KM (podszafkowy): ok. 520 szer. x 290 gl. x 168 wys., w dnie wyciecie 495x260, 12 wkretow.
  # Odleglosc od plyty indukcyjnej min. 450 mm (tu ok. 500).
  ok = tg("AGD", "AGD Okap")
  box(e, "G3 Wyciecie w dnie pod okap 495x260 (AGD znacznik)", 52.5, 547.5, 55, 315, -0.5, T + 0.5, AGD, ok)
  box(e, "G3 Okap korpus nad dnem (AGD)", 52.5, 547.5, 55, 315, T, 128, AGD, ok)
  box(e, "G3 Okap panel pod szafka 520x290 (AGD)", 40, 560, 40, 330, -40, 0, AGD, ok)
  front(e, "G3", "Drzwi (zawiasy L)", UD, 2, 598, 2, UPH - 2)
  uchwyt_maly(e, "G3", 37, 52, UD)
end
cabinet("G4 Wiszaca 600", [1795, 0, UPB], BR, BRY) do |e|
  korpus(e, "G4", 600, UD, UPH, wieniec_gorny: true)
  polka(e, "G4", 600, UD - 20, 450)
  front(e, "G4", "Drzwi (zawiasy P)", UD, 2, 598, 2, UPH - 2)
  uchwyt_maly(e, "G4", 563, 52, UD)
end
wbox("G5 Blenda P 85 (z naddatkiem do sciany)", 1795, 1880, UD, UD + T, UPB + 2, UPB + UPH - 2, FRONT, tg(BLC, "Blenda G5 prawa gora"))
wbox("G1 Dno blendy lewej 127x332", 18, 145, 0, UD, UPB, UPB + T, FRONT, tg(BLC, "Blenda G1 dno"))
wbox("G1 Klocek pod dno 100x100 (dno + bok G2)", 127, 145, 100, 200, UPB + T, UPB + T + 100, LISTWA, tg(LM, "Listwa G1"))
wbox("G5 Klocek pod dno 100x100 (dno + bok G4)", 1795, 1813, 100, 200, UPB + T, UPB + T + 100, LISTWA, tg(LM, "Listwa G5"))
wbox("G5 Dno blendy prawej 85x332 (z naddatkiem)", 1795, 1880, 0, UD, UPB, UPB + T, FRONT, tg(BLC, "Blenda G5 dno"))
wbox("G1 Klocek montazowy dol 100x100 (przez bok G2)", 127, 145, UD - 100, UD, UPB + 100, UPB + 200, LISTWA, tg(LM, "Listwa G1"))
wbox("G1 Klocek montazowy gora 100x100 (przez bok G2)", 127, 145, UD - 100, UD, UPB + UPH - 200, UPB + UPH - 100, LISTWA, tg(LM, "Listwa G1"))
wbox("G5 Klocek montazowy dol 100x100 (przez bok G4)", 1795, 1813, UD - 100, UD, UPB + 100, UPB + 200, LISTWA, tg(LM, "Listwa G5"))
wbox("G5 Klocek montazowy gora 100x100 (przez bok G4)", 1795, 1813, UD - 100, UD, UPB + UPH - 200, UPB + UPH - 100, LISTWA, tg(LM, "Listwa G5"))
wbox("G6 Klocek montazowy 150x100 nad G2 (przez wieniec gorny)", 295, 445, UD - 100, UD, UPB + UPH, UPB + UPH + T, LISTWA, tg(LM, "Listwa G6"))
wbox("G6 Klocek montazowy 150x100 nad G3 (przez wieniec gorny)", 700, 850, UD - 100, UD, UPB + UPH, UPB + UPH + T, LISTWA, tg(LM, "Listwa G6"))
wbox("G6 Klocek montazowy 150x100 nad G4 (przez wieniec gorny)", 1350, 1500, UD - 100, UD, UPB + UPH, UPB + UPH + T, LISTWA, tg(LM, "Listwa G6"))
wbox("G6 Blenda pod sufit 1862x#{CEIL + NAD - UPB - UPH} (z naddatkiem, dotnij)", 18, 1880, UD, UD + T, UPB + UPH, CEIL + NAD, FRONT, tg(BLC, "Blenda G6 pod sufit"))

# ---------- OKLADZINY (drewno) ----------
zb = floor_min(0, 18, 0, 806) - 10
wbox("Okladzina lewej sciany 806x#{(CEIL + NAD - zb).round} (z naddatkiem, dotnij; na wys. ok. 400 wytnij pas pod rury)", 0, 18, 0, 806, zb, CEIL + NAD, DREWNO, tg("Okladziny", "Okladzina lewej sciany"))
# RURY do zmywarki na scianie ok. 400 nad podloga, wystaja ok. 20 mm: w okladzinie wycinasz pas na przelot (18 mm),
# a w drugiej plycie od spodu frezujesz ok. 3 mm rowek na pozostale ~2 mm rur. Druga plyta lezy plasko na okladzinie (bez przekladek),
# tylko pod blatem, od przodu boku B1 do konca boku wneki zlewu. Gora okladziny bez zmian.
wbox("Rury do zmywarki ~20 mm (AGD, orientacyjnie - wys. do zmierzenia)", 0, 20, 100, 824, 380, 420, AGD, tg("AGD", "AGD Rury zmywarki"))
zb2 = floor_min(18, 36, 538, 824) - 10
# plyta dochodzi do przodu boku B1 (y 560), a ponizej korpusu (pod B1, do 100 nad podloga) az do cokolu (y 538) - bez luki
wxprof("Druga plyta dolna przy rurach #{824 - 538}x#{(TOPZ - zb2).round} (do spodu blatu; dol z wycieciem 22x#{(LEG - zb2).round} pod korpus B1, z naddatkiem do podlogi)", 18, 36,
       [[538, zb2], [824, zb2], [824, TOPZ], [560, TOPZ], [560, LEG], [538, LEG]], DREWNO, tg("Okladziny", "Okladzina druga plyta dolna"))

wbox("Plyta nad blatem 1862x550 (z naddatkiem do prawej sciany)", 18, 1880, 0, 18, TOPZ + 38, UPB, DREWNO, tg("Okladziny", "Okladzina nad blatem"))
wbox("Plyta za zlewem 736x#{CEIL + NAD - TOPZ - 38} (z naddatkiem, dotnij)", -360, -342, 824, 1560, TOPZ + 38, CEIL + NAD, DREWNO, tg("Okladziny", "Okladzina za zlewem"))
# bok wneki od strony narozenika: od PODLOGI do sufitu, zamyka cokol i szafke pod zlew
zb = floor_min(-360, 18, 806, 824) - 10
wbox("Plyta bok wneki zlewu 378x#{(CEIL + NAD - zb).round} (z naddatkiem, dotnij)", -360, 18, 806, 824, zb, CEIL + NAD, DREWNO, tg("Okladziny", "Okladzina bok wneki zlewu"))

# ---------- WNEKA ZLEWU (miedzy bokiem wneki a bokiem lodowki: 736) ----------
cabinet("Z1 Szafka pod zlew 732", [-312, -826, LEG], NI, NIY) do |e|
  korpus(e, "Z1", 732, 330, KH, bez_plecow: true, trawersy_pionowe: true)
  front(e, "Z1", "Drzwi L", 330, 0, 365, 2, 718)
  front(e, "Z1", "Drzwi P", 330, 368, 732, 2, 718)
  uchwyt_maly(e, "Z1", 330, 668, 330)
  uchwyt_maly(e, "Z1", 403, 668, 330)
  nozki(e, "Z1", 732, 330)
end

# ---------- OBUDOWA LODOWKI (skrecana na katownikach od strony lodowki) ----------
lg = ROOT.entities.add_group
lg.name = "L Obudowa lodowki (katowniki)"
le = lg.entities
lo = tg("Obudowa lodowki", "Lodowka obudowa - konstrukcja")
# Obudowa lodowki = samodzielny korpus (dwa pelne boki, wience, poprzeczka z tylu), stoi w pionie.
# Scianka-uskok przy zlewie odchyla sie o 15 mm (1545 przy podlodze, 1560 pod sufitem), dlatego L1 stoi od 1560:
# przy podlodze za L1 zostaje ok. 15 mm szczeliny (schowanej). Bok L2 wystaje poza koniec sciany ok. 18 mm u gory, ok. 30 mm na dole.
LY1 = 1578; LY2 = 2192; LW = LY2 - LY1                    # wnetrze 614 mm
zb = floor_min(-670, 18, LY1 - T, LY1) - 10
wbox("L1 Bok lodowki (strona zlewu) 688x#{(CEIL + NAD - zb).round} (z naddatkiem, dotnij)", -670, 18, LY1 - T, LY1, zb, CEIL + NAD, KORPUS, lo, le)
zb = floor_min(-670, 18, LY2, LY2 + T) - 10
wbox("L2 Bok lodowki (strona salonu) 688x#{(CEIL + NAD - zb).round} (z naddatkiem, dotnij)", -670, 18, LY2, LY2 + T, zb, CEIL + NAD, KORPUS, lo, le)
# Samsung RB33B612ESA: 595 x 658 x 1853; zalecane odstepy: boki i tyl > 50 mm, gora > 100 mm.
lfz = floor_max(-670, 18, LY1, LY2)
L3Z = ((lfz + 1853 + 100) / 5.0).ceil * 5                  # spod wienca L3 min. 100 mm nad lodowka
wbox("L3 Wieniec dolny nadstawki #{LW}x620 (z tylu 50 mm komina wentylacyjnego)", -620, 0, LY1, LY2, L3Z, L3Z + T, KORPUS, lo, le)
wbox("L4 Wieniec gorny nadstawki #{LW}x620", -620, 0, LY1, LY2, 2290, 2308, KORPUS, lo, le)
wbox("L5 Plecy HDF nadstawki #{LW}x#{2308 - L3Z}", -623, -620, LY1, LY2, L3Z, 2308, HDF, lo, le)
wbox("L8 Poprzeczka tylna dolna #{LW}x100", -670, -652, LY1, LY2, floor_max(-670, -652, LY1, LY2), floor_max(-670, -652, LY1, LY2) + 100, KORPUS, lo, le)
wbox("L9 Pasek gorny przedni #{LW}x100 (pod blenda)", -100, 0, LY1, LY2, CEIL - 18, CEIL, KORPUS, lo, le)
wbox("L10 Klocek montazowy 100x150 (przez wieniec L4)", -100, 0, 1650, 1800, 2308, 2326, LISTWA, tg(LM, "Listwa L10"), le)
wbox("L10 Klocek montazowy 100x150 (przez wieniec L4)", -100, 0, 1935, 2085, 2308, 2326, LISTWA, tg(LM, "Listwa L10"), le)
wbox("L6 Drzwi nadstawki #{LW - 4}x#{2306 - L3Z - 2}", 0, 18, LY1 + 2, LY2 - 2, L3Z + 2, 2306, FRONT, tg("Fronty", "Front L6 Drzwi nad lodowka"), le)
wbox("L6 Uchwyt czarny maly 32 mm (na dole, na srodku)", 18, 43, (LY1 + LY2) / 2.0 - 16, (LY1 + LY2) / 2.0 + 16, L3Z + 36, L3Z + 48, UCH, tg("Uchwyty", "Uchwyty L6"), le)
wbox("L7 Blenda nad nadstawka #{LW}x#{CEIL + NAD - 2308} (z naddatkiem, dotnij)", 0, 18, LY1, LY2, 2308, CEIL + NAD, FRONT, tg(BLC, "Blenda L7 nad lodowka"), le)
# lodowka zlicowana z frontem obudowy (x = 18); tyl ok. 60 mm od sciany wneki.
# Drzwi przy otwieraniu wychodza 6 mm poza obrys lodowki - luz po bokach 9,5 mm wystarcza.
wbox("Lodowka Samsung RB33B 595x658x1853 (AGD)", -640, 18, LY1 + 9.5, LY1 + 9.5 + 595, floor_max(-640, 18, LY1, LY2), floor_max(-640, 18, LY1, LY2) + 1853, AGD, tg("AGD", "AGD Lodowka"), le)

# kratki wentylacyjne w boku L2 (od strony salonu): dol przy podlodze i gora - nad lodowka, pod wiencem L3
kz = floor_max(-640, 18, LY2, LY2 + T)
wbox("L2 Kratka wentylacyjna dolna ok. 300x80 (AGD znacznik - wytnij otwor)", -450, -150, LY2 + T, LY2 + T + 2, kz + 120, kz + 200, AGD, tg("AGD", "AGD Kratki lodowki"), le)
wbox("L2 Kratka wentylacyjna gorna ok. 300x80 (AGD znacznik - wytnij otwor)", -450, -150, LY2 + T, LY2 + T + 2, L3Z - 90, L3Z - 10, AGD, tg("AGD", "AGD Kratki lodowki"), le)

# obudowa lodowki wysunieta o 18 mm - lico na rowno z frontami szafki zlewowej (x = 36)
lg.transform!(Geom::Transformation.translation([18.mm, 0, 0]))

zoff = $kuchnia_zoff || 0
ROOT.transform!(Geom::Transformation.translation([0, 0, zoff.mm])) if zoff != 0
M.commit_operation
puts "Gotowe: meble kuchni v33 wczytane."
$kuchnia_zoff = nil
puts "Gotowe: pomieszczenie + meble."
