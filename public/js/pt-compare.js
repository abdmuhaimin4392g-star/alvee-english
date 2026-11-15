/* pt-compare.js — Alvee and Muhay side by side. Muhay is INFJ; his column is written for him.
   Her column comes from her own letters, so it is right for any result.
   Each row: [dimension, label EN, label TH, Muhay EN, Muhay TH, { letter: [EN, TH] } for both letters of that dimension]. */
window.PTCMP = {
  muhay: { name: 'Muhay', code: 'INFJ' },
  groups: [
    { ic: '⚡', en: 'Energy and people', th: 'พลังงานและผู้คน', rows: [
      ['mind', 'After a long day', 'หลังจากวันที่ยาวนาน', 'Wants quiet first, then maybe one deep talk.', 'อยากได้ความเงียบก่อน แล้วอาจคุยเรื่องลึก ๆ สักเรื่อง',
        { I: ['Wants quiet time at home to rest.', 'อยากอยู่บ้านเงียบ ๆ เพื่อพักผ่อน'], E: ['Wants to talk, go out or see friends.', 'อยากคุย ออกไปข้างนอก หรือเจอเพื่อน'] }],
      ['mind', 'Social energy', 'พลังในการเข้าสังคม', 'Gets tired in big groups and chooses people carefully.', 'เหนื่อยเมื่ออยู่ในกลุ่มใหญ่ และเลือกคบคนอย่างรอบคอบ',
        { I: ['Gets tired in big groups; likes a few close people.', 'เหนื่อยเมื่ออยู่ในกลุ่มใหญ่ ชอบคนใกล้ชิดไม่กี่คน'], E: ['Gets energy from people and busy places.', 'ได้พลังจากผู้คนและที่ที่คึกคัก'] }],
      ['mind', 'Small talk', 'การคุยเล่น', 'Short is fine, but prefers real and meaningful talk.', 'คุยสั้น ๆ ได้ แต่ชอบการคุยที่จริงจังและมีความหมายมากกว่า',
        { I: ['Polite and kind, but it uses energy.', 'สุภาพและใจดี แต่ทำให้เหนื่อย'], E: ['Easy and fun, a good way to start.', 'ง่ายและสนุก เป็นจุดเริ่มต้นที่ดี'] }],
      ['mind', 'A free weekend', 'วันหยุดสุดสัปดาห์ที่ว่าง', 'Calm time, his own plans and a few chosen people.', 'เวลาที่สงบ แผนของตัวเอง และคนที่เลือกแล้วไม่กี่คน',
        { I: ['A quiet day at home, or with one or two people.', 'วันเงียบ ๆ ที่บ้าน หรืออยู่กับคนหนึ่งหรือสองคน'], E: ['Going out, meeting friends, doing things.', 'ออกไปข้างนอก เจอเพื่อน ทำกิจกรรม'] }],
    ] },
    { ic: '🔭', en: 'How we see things', th: 'วิธีมองสิ่งต่าง ๆ', rows: [
      ['energy', 'What we notice first', 'สิ่งที่สังเกตเห็นก่อน', 'The meaning behind things, and what people really feel.', 'ความหมายเบื้องหลังสิ่งต่าง ๆ และความรู้สึกที่แท้จริงของผู้คน',
        { N: ['Patterns, meanings and possibilities.', 'รูปแบบ ความหมาย และความเป็นไปได้'], S: ['Real details: faces, words, small changes.', 'รายละเอียดจริง ๆ เช่น สีหน้า คำพูด และการเปลี่ยนแปลงเล็ก ๆ'] }],
      ['energy', 'New ideas', 'ไอเดียใหม่ ๆ', 'Likes them when they have a clear purpose.', 'ชอบเมื่อมันมีจุดประสงค์ที่ชัดเจน',
        { N: ['Loves trying new ideas.', 'ชอบลองไอเดียใหม่ ๆ'], S: ['Trusts what has worked before; careful with new things.', 'เชื่อในสิ่งที่เคยได้ผลมาแล้ว และระวังกับสิ่งใหม่'] }],
      ['energy', 'What we remember', 'สิ่งที่จำได้', 'How a moment felt, and what it meant.', 'ความรู้สึกในช่วงเวลานั้น และความหมายของมัน',
        { N: ['The feeling and the big picture.', 'ความรู้สึกและภาพรวม'], S: ['Exact details: dates, places, what was said.', 'รายละเอียดที่แน่นอน เช่น วันที่ สถานที่ และสิ่งที่พูด'] }],
      ['energy', 'The future', 'อนาคต', 'Pictures the long road ahead and where it leads.', 'มองเห็นเส้นทางยาวไกลข้างหน้าและจุดหมายของมัน',
        { N: ['Dreams about what could be.', 'ฝันถึงสิ่งที่อาจเป็นไปได้'], S: ['Thinks about the next real steps.', 'คิดถึงขั้นตอนต่อไปที่ทำได้จริง'] }],
    ] },
    { ic: '⚖️', en: 'How we decide', th: 'วิธีตัดสินใจ', rows: [
      ['nature', 'The first question', 'คำถามแรก', '“Is this right, and how will it affect people?”', '“สิ่งนี้ถูกต้องไหม และจะส่งผลต่อผู้คนอย่างไร”',
        { F: ['“How will everyone feel?”', '“ทุกคนจะรู้สึกอย่างไร”'], T: ['“Does this make sense?”', '“สิ่งนี้มีเหตุผลไหม”'] }],
      ['nature', 'Honesty', 'ความตรงไปตรงมา', 'Tactful and honest: softens the message but keeps it clear.', 'มีไหวพริบและซื่อตรง พูดอย่างนุ่มนวลแต่ยังชัดเจน',
        { F: ['Gentle words, to protect feelings.', 'ใช้คำพูดนุ่มนวลเพื่อถนอมน้ำใจ'], T: ['Direct words, because the truth matters.', 'พูดตรง ๆ เพราะความจริงสำคัญ'] }],
      ['nature', 'Criticism', 'คำวิจารณ์', 'Listens, thinks about it quietly, and keeps what is fair.', 'รับฟัง คิดอย่างเงียบ ๆ และเก็บเฉพาะส่วนที่ยุติธรรม',
        { F: ['Feels it in the heart and may think about it for a long time.', 'รู้สึกถึงมันในใจ และอาจคิดถึงมันไปอีกนาน'], T: ['Takes it as information to improve.', 'มองว่าเป็นข้อมูลเพื่อพัฒนา'] }],
      ['nature', 'A friend with a problem', 'เมื่อเพื่อนมีปัญหา', 'Understands the feeling first, then helps find a way.', 'เข้าใจความรู้สึกก่อน แล้วค่อยช่วยหาทางออก',
        { F: ['Listens and comforts first.', 'รับฟังและปลอบใจก่อน'], T: ['Looks for a solution first.', 'หาทางแก้ก่อน'] }],
    ] },
    { ic: '🗓️', en: 'How we plan', th: 'วิธีวางแผน', rows: [
      ['tactics', 'Plans', 'แผนการ', 'Likes a clear plan and a clear direction.', 'ชอบแผนการที่ชัดเจนและทิศทางที่ชัดเจน',
        { J: ['Likes to plan ahead.', 'ชอบวางแผนล่วงหน้า'], P: ['Likes to keep plans open.', 'ชอบเปิดแผนไว้ให้ยืดหยุ่น'] }],
      ['tactics', 'Deadlines', 'กำหนดเวลา', 'Finishes early and keeps his word.', 'ทำเสร็จก่อนเวลาและรักษาคำพูด',
        { J: ['Finishes early or on time.', 'ทำเสร็จก่อนหรือตรงเวลา'], P: ['Works best close to the deadline.', 'ทำงานได้ดีที่สุดเมื่อใกล้ถึงกำหนด'] }],
      ['tactics', 'Sudden changes', 'การเปลี่ยนแปลงกะทันหัน', 'Accepts them when there is a good reason.', 'ยอมรับได้เมื่อมีเหตุผลที่ดี',
        { J: ['Prefers to know before; a surprise change is stressful.', 'อยากรู้ล่วงหน้า การเปลี่ยนแปลงกะทันหันทำให้เครียด'], P: ['Enjoys them and adapts quickly.', 'สนุกกับมันและปรับตัวได้เร็ว'] }],
      ['tactics', 'At home', 'ที่บ้าน', 'Calm, clean and in order.', 'สงบ สะอาด และเป็นระเบียบ',
        { J: ['Likes things in their place.', 'ชอบให้ของอยู่ในที่ของมัน'], P: ['Relaxed about a little mess.', 'สบาย ๆ กับความรกนิดหน่อย'] }],
    ] },
    { ic: '🤝', en: 'Together', th: 'เมื่ออยู่ด้วยกัน', rows: [
      ['nature', 'Showing care', 'การแสดงความใส่ใจ', 'Full attention, long talks and remembering what matters.', 'ใส่ใจเต็มที่ คุยกันยาว ๆ และจำสิ่งที่สำคัญได้',
        { F: ['Kind words, helping and remembering small things.', 'คำพูดดี ๆ การช่วยเหลือ และการจำเรื่องเล็ก ๆ'], T: ['Practical help and solving problems.', 'ความช่วยเหลือที่ใช้ได้จริงและการแก้ปัญหา'] }],
      ['mind', 'Personal space', 'พื้นที่ส่วนตัว', 'Needs regular time alone to recharge.', 'ต้องการเวลาอยู่คนเดียวเป็นประจำเพื่อเติมพลัง',
        { I: ['Also needs quiet time alone.', 'ต้องการเวลาเงียบ ๆ อยู่คนเดียวเช่นกัน'], E: ['Likes to spend most free time together.', 'ชอบใช้เวลาว่างส่วนใหญ่ด้วยกัน'] }],
      ['nature', 'Disagreements', 'เมื่อเห็นไม่ตรงกัน', 'Stays calm, avoids open conflict and holds firm on what matters most.', 'ใจเย็น หลีกเลี่ยงการปะทะ และยืนหยัดในเรื่องที่สำคัญที่สุด',
        { F: ['Wants peace and may keep quiet to avoid a fight.', 'อยากรักษาความสงบ และอาจเงียบไว้เพื่อเลี่ยงการทะเลาะ'], T: ['Talks it through with facts.', 'พูดคุยกันด้วยเหตุผลและข้อเท็จจริง'] }],
      ['tactics', 'Promises', 'คำสัญญา', 'Takes promises seriously and keeps them.', 'จริงจังกับคำสัญญาและรักษาไว้เสมอ',
        { J: ['Keeps promises carefully, like a plan.', 'รักษาคำสัญญาอย่างระมัดระวัง เหมือนแผนการ'], P: ['Means them, but plans can change.', 'ตั้งใจจริง แต่แผนอาจเปลี่ยนได้'] }],
    ] },
    { ic: '🌩️', en: 'Stress', th: 'ความเครียด', rows: [
      ['mind', 'When upset', 'เวลาไม่สบายใจ', 'Goes quiet and steps back to think.', 'เงียบลงและถอยออกมาเพื่อคิด',
        { I: ['Goes quiet and needs time.', 'เงียบลงและต้องการเวลา'], E: ['Wants to talk about it right away.', 'อยากพูดคุยเรื่องนั้นทันที'] }],
      ['tactics', 'Under pressure', 'ภายใต้ความกดดัน', 'Becomes more serious and focused.', 'จริงจังและมีสมาธิมากขึ้น',
        { J: ['Makes a plan and works harder.', 'วางแผนและทำงานหนักขึ้น'], P: ['Looks for a quick new way out.', 'หาทางออกใหม่อย่างรวดเร็ว'] }],
      ['energy', 'What helps', 'สิ่งที่ช่วยได้', 'Solitude, nature, something creative, and one trusted person.', 'การอยู่คนเดียว ธรรมชาติ การทำอะไรสร้างสรรค์ และคนที่ไว้ใจได้สักคน',
        { N: ['Time to think, music or something creative.', 'เวลาคิด ดนตรี หรือการทำอะไรสร้างสรรค์'], S: ['Rest, good food, a clean room and a normal routine.', 'การพักผ่อน อาหารอร่อย ห้องที่สะอาด และกิจวัตรตามปกติ'] }],
    ] },
  ],
  // what the same / different letters mean for the two of you
  letters: {
    mind: { same: ['You both recharge in quiet. Give each other calm time without taking it personally.', 'ทั้งคู่เติมพลังด้วยความเงียบ ให้เวลาที่สงบแก่กันโดยไม่ต้องคิดมาก'], diff: ['One of you needs quiet, the other needs people. Plan both: some time out, some time alone.', 'คนหนึ่งต้องการความเงียบ อีกคนต้องการผู้คน วางแผนให้มีทั้งสองอย่าง ทั้งเวลาออกไปข้างนอกและเวลาส่วนตัว'] },
    energy: { same: ['You see the world in a similar way, so you often understand each other quickly.', 'ทั้งคู่มองโลกในแบบคล้ายกัน จึงมักเข้าใจกันได้เร็ว'], diff: ['Muhay looks at the meaning; you look at the real details. Together you see the whole picture. Say what you notice, and ask what he means.', 'มูไฮมองที่ความหมาย คุณมองที่รายละเอียดจริง เมื่ออยู่ด้วยกันจึงเห็นภาพครบถ้วน บอกสิ่งที่คุณสังเกตเห็น และถามว่าเขาหมายความว่าอะไร'] },
    nature: { same: ['You both decide with your hearts and care about how people feel.', 'ทั้งคู่ตัดสินใจด้วยหัวใจ และใส่ใจความรู้สึกของผู้คน'], diff: ['One of you starts with feelings, the other with logic. Ask “How do you feel?” and “What do you think?”', 'คนหนึ่งเริ่มจากความรู้สึก อีกคนเริ่มจากเหตุผล ลองถามกันว่า “รู้สึกอย่างไร” และ “คิดอย่างไร”'] },
    tactics: { same: ['You both like plans and keeping your word, so life together feels steady.', 'ทั้งคู่ชอบวางแผนและรักษาคำพูด ชีวิตด้วยกันจึงรู้สึกมั่นคง'], diff: ['One likes plans, the other likes freedom. Agree on the important plans and keep the rest flexible.', 'คนหนึ่งชอบแผน อีกคนชอบอิสระ ตกลงกันเรื่องแผนการที่สำคัญ แล้วให้เรื่องอื่นยืดหยุ่นได้'] },
  },
};
