# Assigns a part to a viewer layer based on its name, material and thickness.
# The patterns match the (Polish) part and material names used in the SketchUp scripts.
module Classify
  module_function

  ROOM_NAME = /Sciana|Podloga|Sufit|Plytki|Drzwi wejsciowe|Oscieznica|Drzwi do pokoju|Rozdzielnia -|Przewody|Gniazdko|Lozko|Materac|Zaglowek|Stelaz|Telewizor/
  ROOM_GROUP = /pomieszczenie|Przedpokoj|Nisza|Sypialnia|Kuchnia_pomiar|Salon|Podloga gotowa/i

  # Cabinet code at the start of a name, e.g. "G3", "RTV K1", "N1 lewa" (used for exploding).
  def unit(name)
    name.to_s[/\A(RTV K\d+|RTV|[A-Z]{1,2}\d+(?: (?:lewa|prawa))?)(?=\s)/, 1]
  end

  def layer(name:, material:, thickness:, path: [])
    m = material.to_s
    return 'room' if path.any? { |p| p =~ ROOM_GROUP } || name =~ ROOM_NAME || m =~ /^(Sciana|Sufit|Podloga|Drzwi_wejsciowe|Rozdzielnia|Przewody|Lozko|Materac|Geberit|Plytki)/
    return 'assembly' if name =~ /Otwor|znacznik/
    return 'appliances' if m =~ /AGD|^Zlew/ || name =~ /AGD|Zlew|Bateria|Plyta indukcyjna|Lodowka|Rury|Kratka|Okap/
    return 'handles' if name =~ /Uchwyt/
    return 'legs' if name =~ /Nozka|Stopka|Klips/
    return 'drawers' if name =~ /Merivobox|Dno 16mm|Tyl 16mm/
    return 'assembly' if name =~ /Klocek|Listwa|Drazek|Zawias|znacznik|Otwor/
    return 'back' if m =~ /HDF/ || name =~ /Plecy/
    return 'worktop' if thickness >= 30
    return 'front' if name =~ /Drzwi|Drzwiczki|Szuflada .*\(|Szuflada (dolna|srodkowa|gorna)\b(?!.*(Dno|Tyl))|Klapa|Front/
    return 'fillers' if name =~ /Blenda|Cokol|Plyta nad blatem|Plyta za zlewem|Pasek|Poprzeczka/
    return 'cladding' if m =~ /Drewno/ || name =~ /Okladzina|Obudowa|Druga plyta/
    'carcass'
  end
end
