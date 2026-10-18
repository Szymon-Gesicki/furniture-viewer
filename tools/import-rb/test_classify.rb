require 'minitest/autorun'
require_relative 'classify'

class ClassifyTest < Minitest::Test
  def l(name, mat = 'Korpus_kaszmir', th = 18, path = []) = Classify.layer(name: name, material: mat, thickness: th, path: path)

  def test_carcass_and_front
    assert_equal 'carcass', l('G3 Bok L 900x332')
    assert_equal 'front', l('G3 Drzwi (zawiasy L) 596x896', 'Front_kaszmir')
    assert_equal 'front', l('P2 Szuflada gorna (M, sztucce) 596x140', 'Front_kaszmir')
  end

  def test_drawer_internals_before_fronts
    assert_equal 'drawers', l('P2 Szuflada gorna Dno 16mm 513x490', 'Dno_szuflady_16', 16)
    assert_equal 'drawers', l('P2 Szuflada gorna Bok L Merivobox M', 'Blum_Merivobox_stal (okucie, nie ciac)', 13)
  end

  def test_other_layers
    assert_equal 'back', l('G3 Plecy HDF 600x900', 'Plecy_HDF', 3)
    assert_equal 'worktop', l('Blat Elka 1468x600', 'Drewno_blat', 38)
    assert_equal 'cladding', l('RTV Obudowa gora (drewno) 1100x300', 'Drewno_blat')
    assert_equal 'handles', l('P2 Uchwyt czarny 190 mm', 'Uchwyt_czarny (okucie, nie ciac)', 10)
    assert_equal 'legs', l('S1 Nozka 100 regulowana', 'Nozka_klips (okucie, nie ciac)', 34)
    assert_equal 'fillers', l('Cokol Elka 1530 wys. 116', 'Front_kaszmir')
    assert_equal 'assembly', l('Otwor sruba L (do zmierzenia)', 'AGD', 1)
    assert_equal 'appliances', l('Lodowka Samsung RB33B 595x658x1853 (AGD)', 'AGD', 595)
    assert_equal 'room', l('Sciana tylna', 'Sciana_lazienka', 50)
    assert_equal 'room', l('Cokolwiek', 'X', 18, ['Lazienka_pomieszczenie'])
  end

  def test_unit
    assert_equal 'G3', Classify.unit('G3 Drzwi (zawiasy L) 596x896')
    assert_equal 'RTV K2', Classify.unit('RTV K2 Bok L 332x282')
    assert_equal 'N1 lewa', Classify.unit('N1 lewa Bok L 550x300')
    assert_nil Classify.unit('Bok L 2196x122')
  end
end
