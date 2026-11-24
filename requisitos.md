# Backlog do Produto

| ID | Título | Responsável | Prioridade | Pontos | Depende de |
|---|---|---|---|---|---|
| HU01 | Gerenciar horários das aulas | Gabriel Bezerra | Must | 3 | - |
| HU02 | Gerenciar escalas de trabalho | Janilson | Must | 5 | - |
| HU03 | Gerenciar compromissos fixos | João Gabriel | Must | 5 | - |
| HU04 | Gerenciar atividades recorrentes | João Gabriel | Should | 5 | - |
| HU05 | Gerenciar tarefas | Matheus | Must | 5 | - |
| HU06 | Gerar rotina semanal automatizada | Camila | Must | 8 | HU01 a HU05 |
| HU07 | Painel de pendências | Matheus | Should | 5 | HU05, HU06 |

## HU01 – Gerenciar horários das aulas

- **Responsável:** Gabriel Bezerra
- **Descrição:** Como estudante trabalhador, quero cadastrar os horários das minhas disciplinas, para que a rotina semanal respeite meus horários de aula.
- **CA1 – Cadastro válido:** Dado que informei nome, dia, início e término diferentes, quando confirmo, então a disciplina aparece na listagem e o sistema informa que foi salva.
- **CA2 – Horários iguais:** Dado que início e término são idênticos, quando confirmo, então o sistema bloqueia o salvamento e pede horários diferentes.
- **CA3 – Exclusão:** Dado que escolhi excluir uma disciplina, quando confirmo a exclusão, então ela some da listagem e os planejamentos anteriores são invalidados.
- **Regras de negócio:** campos obrigatórios (nome, dia, início, término); local é opcional.
- **Rastreabilidade:** Documento de Visão, seções 5.2 e 5.3.