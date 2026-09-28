# Fontes e parâmetros legais

Cada parâmetro usado em `src/calc.js` está listado abaixo com a sua fonte. Acesso às fontes: **setembro de 2026**.

Legenda de status:

- **Lei**: previsto expressamente em norma publicada.
- **Estimativa oficial**: número publicado por órgão público, sem força vinculante.
- **Premissa**: simplificação do simulador ou ponto ainda não regulamentado. Todas as premissas podem ser editadas na interface ou estão documentadas no README.

## 1. Cronograma de transição

| Parâmetro | Valor no simulador | Status | Base legal / fonte |
|---|---|---|---|
| 2026: alíquotas-teste | CBS 0,9% · IBS 0,1% (estadual) | Lei | EC 132/2023, ADCT art. 125, caput [1]; LC 214/2025, arts. 343 e 346 [2][9] |
| 2026: compensação / dispensa | Valores compensados com PIS/Cofins do mesmo período; dispensa de recolhimento para quem cumpre as obrigações acessórias. **Efeito líquido zero** | Lei | ADCT art. 125, § 1º [1][8]; LC 214/2025, art. 348 [8][9] |
| 2026: Simples Nacional | Alíquotas-teste não se aplicam aos optantes | Lei | LC 214/2025, art. 348 (conforme [9]) |
| 2027: CBS plena; PIS/Cofins extintos | PIS/Cofins = 0 a partir de 2027 | Lei | ADCT art. 126 [1][3] |
| 2027: IPI | Alíquotas zeradas, exceto produtos com industrialização incentivada na Zona Franca de Manaus (opção "IPI mantido — ZFM") | Lei | ADCT art. 126 [1][3] |
| 2027: Imposto Seletivo | Entra em vigor. **Não modelado** | Lei | ADCT art. 126 [1][3] |
| 2027–2028: IBS | 0,05% estadual + 0,05% municipal = 0,1% | Lei | ADCT art. 127, caput [1][8] |
| 2027–2028: CBS | Alíquota de referência **menos 0,1 ponto percentual** | Lei | ADCT art. 127, parágrafo único [1][8] |
| 2029–2032: ICMS e ISS | Cobrados a 9/10, 8/10, 7/10 e 6/10 das alíquotas vigentes | Lei | ADCT art. 128 [1][3][8] |
| 2029–2032: IBS | Alíquota de referência × 10%, 20%, 30%, 40% | **Premissa** | As alíquotas de referência desses anos serão fixadas para repor a perda de ICMS/ISS (ADCT art. 130). O simulador usa a proporção complementar como aproximação |
| 2033: modelo pleno | ICMS e ISS extintos; IBS e CBS integrais | Lei | ADCT art. 129 [1] |

## 2. Alíquotas de referência (padrões editáveis)

| Estimativa | CBS | IBS | Total | Status | Fonte |
|---|---|---|---|---|---|
| **Resolução CGIBS nº 14, de 29/07/2026** (DOU 31/07/2026). **Padrão do simulador** | 9,21% (implícita = 27,91 − 18,70) | 18,70% | **27,91%** | Estimativa oficial, "parâmetro metodológico", não vinculante | [4][5][6] |
| Estimativa inicial da SERT/Ministério da Fazenda (2024), citada na própria Resolução CGIBS nº 14/2026 | 8,8% | 17,7% | 26,5% | Estimativa oficial (superada) | [4][7][10] |
| Ministério da Fazenda após a sanção da LC 214/2025 (jan/2025) | — | — | "em torno de 28%" | Estimativa oficial, sem divisão CBS/IBS | [11] |
| Nota técnica SERT/MF (ago/2024), após alterações na Câmara | — | — | 27,97% | Estimativa oficial (superada) | [12][13] |

Observações:

- **A última estimativa oficial com divisão entre IBS e CBS encontrada é a da Resolução CGIBS nº 14/2026.** O CGIBS publicou apenas a parcela do IBS (18,70%) e o total (27,91%). A CBS de 9,21% é **implícita** (diferença) e deve ser tratada como estimativa.
- Em 14/09/2026 a Receita Federal enviou ao TCU o **modelo de cálculo** da CBS de 2027 **sem estimativa numérica** [14]. O TCU tem até 30/10/2026 para homologar e o Senado até 15/12/2026 para fixar as alíquotas de referência de 2027 (prazos estendidos em 45 dias) [5][14].
- **Teto de 26,5%**: se a alíquota de referência estimada superar 26,5%, a LC 214/2025 obriga o Poder Executivo a propor medidas de redução. O teto não se aplica automaticamente [4][6].

## 3. Reduções de alíquota (LC 214/2025)

| Tratamento | Fator sobre a alíquota padrão | Status | Fonte |
|---|---|---|---|
| Alíquota zero: produtos da Cesta Básica Nacional (Anexo I) | 0 | Lei | LC 214/2025, art. 125 [2][15] |
| Redução de 60%: serviços de educação e de saúde, dispositivos médicos, medicamentos, alimentos, higiene, insumos agropecuários, produções culturais, entre outros (Anexos II a XI) | 0,4 | Lei | LC 214/2025, art. 128 e seguintes [2][15][16] |
| Redução de 30%: serviços de 18 profissões intelectuais regulamentadas (administradores, advogados, arquitetos, contadores, economistas, engenheiros etc.), com requisitos para sociedades | 0,7 | Lei | LC 214/2025, art. 127 [2][15][16] |
| Manutenção de créditos em vendas com alíquota zero | Ligada por padrão | **Premissa** | Confirme na regulamentação para o seu produto |

A redução se aplica à operação, não ao setor: cada item precisa se enquadrar nas listas e condições legais [16].

## 4. Simples Nacional

| Ponto | Tratamento no simulador | Status | Fonte |
|---|---|---|---|
| Opção por recolher IBS/CBS pelo regime regular ("por fora" do DAS), semestral, a partir de 2027 | Opção "Por fora (regime regular)" | Lei | LC 214/2025, art. 41 [2][15][17] |
| Permanecendo no DAS, o adquirente só se credita do IBS/CBS efetivamente pago no Simples | Aviso na interface. Carga do DAS mantida constante | Lei + **premissa** | LC 214/2025, art. 47 (conforme [15]); [17] |
| Parcela de PIS/Cofins (15,5%) e de ICMS/ISS (34%) no DAS | Padrão da 1ª faixa do Anexo I | **Premissa** editável | Partilha da LC 123/2006, Anexo I |

## 5. Tributos atuais e base de cálculo

| Parâmetro | Valor | Status | Fonte |
|---|---|---|---|
| PIS/Cofins não cumulativo | 1,65% + 7,6% = 9,25% | Lei | Leis 10.637/2002 e 10.833/2003 |
| PIS/Cofins cumulativo | 0,65% + 3% = 3,65% | Lei | Lei 9.718/1998 |
| Exclusão do ICMS da base de PIS/Cofins | Opcional (ligada por padrão) | Jurisprudência | STF, RE 574.706 (Tema 69) |
| ICMS/ISS fora da base do IBS/CBS | Aplicado | Lei | LC 214/2025, art. 12, § 2º [18] |
| IBS/CBS na base do ICMS/ISS (2027–2032) | Desligado por padrão; opção "Incluir IBS/CBS na base do ICMS/ISS" | **Premissa** (ponto controvertido; há estados que defendem a inclusão) | [18] |

## 6. Split payment (conceito, não modelado)

A LC 214/2025, arts. 31 a 35, prevê o **recolhimento na liquidação financeira**: no pagamento eletrônico (cartão, Pix, boleto), o prestador de serviço de pagamento separa o IBS/CBS e o repassa diretamente ao Fisco, e o fornecedor recebe o valor líquido [2][15]. A implantação depende de regulamentação e é gradual. O efeito é principalmente de **fluxo de caixa**, não de carga, e por isso fica fora do cálculo anual do simulador.

## Referências

1. Emenda Constitucional nº 132/2023 (Planalto): <https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm> (acesso em set/2026)
2. Lei Complementar nº 214/2025 (Planalto): <https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm> (acesso em set/2026)
3. Receita Federal, *Entenda a Reforma Tributária do Consumo*: <https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/reforma-tributaria-do-consumo/entenda> (acesso em set/2026)
4. Resolução CGIBS nº 14, de 29/07/2026: <https://www.cgibs.gov.br/upload/arquivos/202607/31144942-resoluc-ao-cgibs-n-14-de-29-de-julho-de-2026-proposta-percentual-ibs-cgibs-2027.pdf> (acesso em set/2026)
5. Contmatic, *Alíquota de referência IBS e CBS: 27,91% e a trava de 26,5%*: <https://simplifique.contmatic.com.br/blogs/aliquota-referencia-ibs-cbs-cgibs-estima-27-91> (acesso em set/2026)
6. Fenacon, *Comitê Gestor estima alíquota do IVA em 27,91%*: <https://fenacon.org.br/reforma-tributaria/comite-gestor-estima-aliquota-do-iva-em-2791-acima-do-teto-previsto-na-reforma-tributaria/> (acesso em set/2026)
7. Ministério da Fazenda/SERT, *Alíquotas de referência do IBS e da CBS: estimativas atualizadas* (nota técnica, 2024): <https://www.gov.br/fazenda/pt-br/acesso-a-informacao/acoes-e-programas/reforma-tributaria/regulamentacao-da-reforma-tributaria/lei-geral-do-ibs-da-cbs-e-do-imposto-seletivo/notas/nota-tecnica-aliquotas_2024-07-01_sertmf-1.pdf> (acesso em set/2026)
8. Tax Group, *Alíquota do IBS e da CBS em 2026 e o que muda até 2033*: <https://www.taxgroup.com.br/intelligence/aliquota-ibs-cbs/> (acesso em set/2026)
9. Jurídico Certo, *Não recolher IBS e CBS em 2026 depende de quê? A condição do art. 348*: <https://juridicocerto.com/p/thiago-reis2/artigos/nao-recolher-ibs-e-cbs-em-2026-depende-de-que-a-condicao-do-art-348-8001> (acesso em set/2026)
10. Assertif, *CBS: teste em 2026 e referência de 8,8% para 2027*: <https://assertif.com.br/cbs-teste-2026-referencia-88-2027-impactos/> (acesso em set/2026)
11. Forbes Brasil, *Fazenda projeta alíquota padrão em torno de 28% após sanção* (jan/2025): <https://forbes.com.br/forbes-money/2025/01/fazenda-projeta-aliquota-padrao-em-torno-de-28-com-reforma-tributaria-apos-sancao/> (acesso em set/2026)
12. Ministério da Fazenda/SERT, *Estimativa de impacto sobre a alíquota de referência* (ago/2024): <https://www.gov.br/fazenda/pt-br/central-de-conteudo/publicacoes/notas-informativas/2024/agosto/nota-tecnica-aliquotas-sertmf.pdf> (acesso em set/2026)
13. Gazeta do Povo, *Fazenda confirma alíquota do IVA em 27,97%* (ago/2024): <https://www.gazetadopovo.com.br/economia/fazenda-confirma-aliquota-do-iva-em-quase-28-a-maior-do-mundo/> (acesso em set/2026)
14. Contábeis, *Receita apresenta modelo de cálculo da CBS ao TCU sem estimar alíquota* (14/09/2026): <https://www.contabeis.com.br/noticias/79408/receita-apresenta-modelo-de-calculo-da-cbs-ao-tcu-sem-estimar-aliquota> (acesso em set/2026)
15. Barbieri Advogados, *LC 214/2025: guia completo*: <https://www.barbieriadvogados.com/lc-214/> (acesso em set/2026)
16. Ozai, *IBS e CBS: quais atividades têm redução de 30% ou 60%?*: <https://www.ozai.com.br/atividades-com-reducao-de-30-ou-60-no-ibs-cbs/> (acesso em set/2026)
17. Contábeis, *"O pulo do gato" sobre o Simples Nacional e a Reforma Tributária*: <https://www.contabeis.com.br/artigos/73075/o-pulo-do-gato-sobre-o-simples-nacional-e-a-reforma-tributaria-lc-214-2025/> (acesso em set/2026)
18. Econet, *Reforma tributária em transição: a base de cálculo do ICMS diante do IBS e da CBS*: <https://blog.econeteditora.com.br/icms-na-base-do-ibs-e-cbs/> (acesso em set/2026)

> Nota de verificação: as notas técnicas do Ministério da Fazenda [7][12] não puderam ser lidas diretamente (os PDFs não renderizaram); os números delas vêm da Resolução CGIBS nº 14/2026 [4] e das fontes jornalísticas e especializadas [10][11][13]. O texto integral da LC 214/2025 no Planalto não pôde ser lido por inteiro de forma automatizada durante a pesquisa. Os números de artigo da LC foram conferidos em mais de uma fonte secundária especializada. Antes de citar um artigo em parecer, confira-o no texto oficial compilado.
