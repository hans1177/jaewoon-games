#!/usr/bin/env python3
"""선박 3D 디자인 지시서 표 생성: python3 tools/gen_ship_prompts.py > docs/ship_design_prompts.csv
Ships.luau 의 배 목록(id·이름·등급·돛/노)을 읽고, 아래 DESIGN 표의 역사 고증 묘사를 붙인다."""
import csv, re, sys
src = open('src/ReplicatedStorage/Shared/Ships.luau', encoding='utf-8').read()
# id, 형태 묘사(선체·돛·장식), 시대·지역 단서
DESIGN = {
 'caravel': ('small 2-3 mast lateen-rigged ship, slim hull, low forecastle, red cross on sail', '15th c. Portugal'),
 'fluyt': ('pear-shaped round-bellied cargo ship, narrow deck, 3 square-rigged masts, almost no guns', '17th c. Netherlands'),
 'frigate': ('sleek 3-mast warship, single gun deck with 12 gun ports, tall square sails, clean low hull', '18th c. Europe'),
 'galleon': ('large 4-deck stern castle, ornate carved high stern, 3-4 masts square+lateen, 10 gun ports', '16th-17th c. Spain/England'),
 'galley': ('long narrow oared warship, 20 oars per side, one lateen sail, bronze ram at bow, red hull stripe', 'Mediterranean 16th c.'),
 'xebec': ('3-mast lateen-rigged raider, overhanging bow and stern, oar ports, narrow fast hull', 'Mediterranean/Barbary 17th c.'),
 'cog': ('single-mast clinker-built round hull, tall straight stem/stern, square sail, fore/aft castles', 'North Sea 13th-14th c.'),
 'carrack': ('3-4 mast ocean trader, huge rounded hull, towering forecastle and stern castle, painted crest', 'Portugal/Spain 15th c.'),
 'brigantine': ('2-mast fast ship: square-rigged foremast, fore-and-aft main, slim hull, 8 small guns', 'Caribbean 17th c.'),
 'dhow': ('single big lateen sail on long slanted yard, sewn-plank hull, carved sharp bow, no deck cabin except small stern', 'Indian Ocean'),
 'baghlah': ('large dhow, 2 masts, ornate carved high transom stern with windows, curved prow', 'Red Sea/India'),
 'mtepe': ('sewn-plank hull lashed with coir rope, single square mat sail, curved bow with decorated prow board', 'Swahili coast'),
 'pirogue': ('long dugout canoe hull, outrigger-free, 12 paddlers, small mat sail, painted bow', 'West Africa'),
 'junk': ('flat-bottomed hull, battened full-length bamboo sails (3 masts), high square stern, watertight bulkheads, eyes painted on bow', 'Ming China'),
 'geobukseon': ('turtle-shell covered armoured warship, iron spikes on roof, dragon-head bow emitting smoke, oars + 2 sails', 'Joseon Korea 1592'),
 'prau': ('slim hull with one outrigger float, single tilted crab-claw sail, very light and fast', 'Southeast Asia'),
 'pattamar': ('Malabar coastal trader, 2 masts, lateen sails, curved bow, open deck with cargo', 'Malabar India'),
 'privateer': ('small fast armed merchant, 2-3 mast, gun ports painted to look like merchant, English flag', 'England 17th c.'),
 'east_indiaman': ('huge round cargo ship, 3 masts, wide deck, many windows at stern, orange-white-blue flag', 'Dutch VOC 17th c.'),
 'corvette': ('small 3-mast warship, clean hull, 8-10 guns, tricolor flag', 'France 18th c.'),
 'nau': ('Portuguese India-run nau, thick rounded hull, high castles, red cross sails, strong timbers', 'Portugal 16th c.'),
 'kadirga': ('Ottoman galley, 24 oars per side, gilded stern pavilion, crescent flag, one lateen sail', 'Ottoman 16th c.'),
 'jahazi': ('large Swahili sailing ship, one big lateen sail, high prow, carved stern', 'Swahili coast'),
 'kotia': ('stout Malabar pepper trader, 2 masts, curved keel, wide hold hatches', 'Malabar India'),
 'sekibune': ('narrow fast oared boat with shield-board gunwale, 20 oars, small square sail, warrior shields on sides', 'Sengoku Japan'),
 'manila_galleon': ('giant 3-4 deck galleon, massive stern castle, silver-and-silk cargo, Spanish flag', 'Spain Pacific 17th c.'),
 'paddle_steamer': ('wooden hull with two side paddle wheels, one tall funnel, 2 masts for backup sail', '1840s Britain'),
 'ironclad_frigate': ('iron-armoured hull with sloped plates, funnel, 3 masts, big broadside guns', '1860s'),
}
STYLE = ('Low-poly stylized game model, readable silhouette from far camera, chunky shapes, '
         'wood/cloth/rope materials, hand-painted flat colors, no text, no modern objects.')
ids = re.findall(r'\n\s*(?:\[?"?)(\w+)"? = \{\s*id = "(\w+)", class = (\d), name = "([^"]+)"', src)
w = csv.writer(sys.stdout)
w.writerow(['ship_id', 'name', 'class', 'design', 'era_region', 'prompt'])
for _, sid, cls, name in ids:
    if sid not in DESIGN:
        continue
    d, era = DESIGN[sid]
    w.writerow([sid, name, cls, d, era,
                f'{era} {name} ({sid}): {d}. {STYLE} Deliver: 3/4 view, side, front, top (orthographic), on plain grey.'])
