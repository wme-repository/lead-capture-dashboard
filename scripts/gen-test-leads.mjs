// Gera leads de teste com acentos UTF-8 corretos (rodar com node).
const BASE = 'https://leads.esqtools.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LEADS = [
  // nome, email, phone, dom, src, cont, lpc, score, grade, idade, renda, genero, escolaridade, situacao, nivel
  ['Mariana Souza','mariana.souza@gmail.com','(11) 98111-0001','trt.oesquadraodeelite.com.br','facebook','criativo-a','PROJETOTRT2-LP01',248,'A','25 a 34 anos','R$ 3.000 a 5.000','Feminino','Superior','Empregado(a)','Estudo há mais de 1 ano'],
  ['Carlos Eduardo','carlos.edu@gmail.com','(21) 98111-0002','trt.oesquadraodeelite.com.br','facebook','criativo-a','PROJETOTRT2-LP01',205,'B','35 a 44 anos','Acima de R$ 5.000','Masculino','Pós-graduação','Empregado(a)','Estudo há mais de 2 anos'],
  ['Patrícia Gomes','patricia.gomes@gmail.com','(31) 98111-0003','trt.oesquadraodeelite.com.br','facebook','criativo-b','PROJETOTRT2-LP01',142,'C','25 a 34 anos','R$ 1.500 a 3.000','Feminino','Superior','Desempregado(a)','Estou começando do zero'],
  ['Rafael Mendes','rafael.mendes@gmail.com','(85) 98111-0004','trt.oesquadraodeelite.com.br','facebook','criativo-b','PROJETOTRT2-LP01',78,'D','18 a 24 anos','Até R$ 1.500','Masculino','Ensino Médio','Estudando','Estou começando do zero'],
  ['Juliana Castro','juliana.castro@gmail.com','(47) 98111-0005','trt.oesquadraodeelite.com.br','facebook','criativo-a','PROJETOTRT2-LP01',231,'A','25 a 34 anos','R$ 3.000 a 5.000','Feminino','Pós-graduação','Empregado(a)','Estudo há mais de 1 ano'],
  ['Bruno Almeida','bruno.almeida@gmail.com','(11) 98111-0006','trt.oesquadraodeelite.com.br','facebook','criativo-c','PROJETOTRT2-LP01',188,'B','35 a 44 anos','R$ 3.000 a 5.000','Masculino','Superior','Empregado(a)','Estudo há mais de 1 ano'],
  ['Camila Ribeiro','camila.ribeiro@gmail.com','(51) 98111-0007','trt.oesquadraodeelite.com.br','facebook','criativo-b','PROJETOTRT2-LP01',165,'C','45 anos ou mais','R$ 1.500 a 3.000','Feminino','Ensino Médio','Desempregado(a)','Estou começando do zero'],
  ['Diego Martins','diego.martins@gmail.com','(62) 98111-0008','trt.oesquadraodeelite.com.br','facebook','criativo-c','PROJETOTRT2-LP01',95,'D','18 a 24 anos','Até R$ 1.500','Masculino','Ensino Médio','Estudando','Estou começando do zero'],
  ['Fernanda Lima','fernanda.lima@gmail.com','(41) 98111-0009','trt.oesquadraodeelite.com.br','facebook','criativo-a','PROJETOTRT2-LP01',219,'B','25 a 34 anos','Acima de R$ 5.000','Feminino','Superior','Empregado(a)','Estudo há mais de 2 anos'],
  ['Thiago Nunes','thiago.nunes@gmail.com','(71) 98111-0010','trt.oesquadraodeelite.com.br','facebook','criativo-b','PROJETOTRT2-LP01',154,'C','35 a 44 anos','R$ 1.500 a 3.000','Masculino','Superior','Empregado(a)','Estudo há mais de 1 ano'],
  ['Amanda Rocha','amanda.rocha@gmail.com','(11) 98222-0001','lp.oesquadraodeelite.com.br','instagram','criativo-b','PROJETOTRT2-LP02',240,'A','25 a 34 anos','R$ 3.000 a 5.000','Feminino','Pós-graduação','Empregado(a)','Estudo há mais de 1 ano'],
  ['Lucas Pereira','lucas.pereira@gmail.com','(21) 98222-0002','lp.oesquadraodeelite.com.br','instagram','criativo-b','PROJETOTRT2-LP02',199,'B','35 a 44 anos','Acima de R$ 5.000','Masculino','Superior','Empregado(a)','Estudo há mais de 2 anos'],
  ['Beatriz Costa','beatriz.costa@gmail.com','(31) 98222-0003','lp.oesquadraodeelite.com.br','instagram','criativo-c','PROJETOTRT2-LP02',133,'C','18 a 24 anos','Até R$ 1.500','Feminino','Ensino Médio','Estudando','Estou começando do zero'],
  ['Gabriel Santos','gabriel.santos@gmail.com','(85) 98222-0004','lp.oesquadraodeelite.com.br','instagram','criativo-c','PROJETOTRT2-LP02',82,'D','18 a 24 anos','Até R$ 1.500','Masculino','Ensino Médio','Desempregado(a)','Estou começando do zero'],
  ['Larissa Dias','larissa.dias@gmail.com','(47) 98222-0005','lp.oesquadraodeelite.com.br','instagram','criativo-b','PROJETOTRT2-LP02',226,'A','25 a 34 anos','R$ 3.000 a 5.000','Feminino','Superior','Empregado(a)','Estudo há mais de 1 ano'],
  ['Pedro Henrique','pedro.henrique@gmail.com','(11) 98222-0006','lp.oesquadraodeelite.com.br','instagram','criativo-a','PROJETOTRT2-LP02',177,'C','35 a 44 anos','R$ 1.500 a 3.000','Masculino','Superior','Empregado(a)','Estudo há mais de 1 ano'],
  ['Vanessa Moreira','vanessa.moreira@gmail.com','(51) 98222-0007','lp.oesquadraodeelite.com.br','instagram','criativo-a','PROJETOTRT2-LP02',192,'B','25 a 34 anos','R$ 3.000 a 5.000','Feminino','Pós-graduação','Empregado(a)','Estudo há mais de 1 ano'],
  ['Rodrigo Barbosa','rodrigo.barbosa@gmail.com','(62) 98222-0008','lp.oesquadraodeelite.com.br','instagram','criativo-c','PROJETOTRT2-LP02',88,'D','45 anos ou mais','Até R$ 1.500','Masculino','Ensino Médio','Desempregado(a)','Estou começando do zero'],
  ['Isabela Freitas','isabela.freitas@gmail.com','(41) 98222-0009','lp.oesquadraodeelite.com.br','instagram','criativo-b','PROJETOTRT2-LP02',213,'B','35 a 44 anos','Acima de R$ 5.000','Feminino','Superior','Empregado(a)','Estudo há mais de 2 anos'],
  ['Felipe Cardoso','felipe.cardoso@gmail.com','(71) 98222-0010','lp.oesquadraodeelite.com.br','instagram','criativo-a','PROJETOTRT2-LP02',160,'C','25 a 34 anos','R$ 1.500 a 3.000','Masculino','Superior','Estudando','Estou começando do zero'],
];

for (const [nome, email, phone, dom, src, cont, lpc, score, grade, idade, renda, genero, esc, sit, nivel] of LEADS) {
  await fetch(`${BASE}/api/webhook/lead`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: nome, email, phone,
      pagina_captura: `https://${dom}/?utm_source=${src}&utm_medium=cpc&utm_campaign=${lpc}&utm_content=${cont}&utm_term=trt`,
      utm_source: src, utm_medium: 'cpc', utm_campaign: lpc, utm_content: cont, utm_term: 'trt',
    }),
  });
  await sleep(300);
  await fetch(`${BASE}/api/webhook/quest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: nome, email, phone, score, grade,
      answers: {
        '1': nivel, '2': 'Sim, já estudei', '3': 'Conheço', '4': 'Busco estabilidade',
        '5': idade, '6': renda, '7': genero, '8': esc, '9': sit,
        '10': 'Mais de 1 ano', '11': 'Passar no TRT',
      },
    }),
  });
  console.log(`  ${nome} | ${lpc} | ${grade}/${score} | ${idade}/${genero}`);
  await sleep(300);
}
console.log('=== concluido ===');
