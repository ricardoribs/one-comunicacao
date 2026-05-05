# IR Plan

## Objetivo

Definir o fluxo minimo de resposta a incidentes para o go-live da plataforma ONE.

## Severidade

- `SEV-1`: vazamento de dados, bypass de tenant, execucao remota, comprometimento de segredo raiz, indisponibilidade total.
- `SEV-2`: comprometimento de conta privilegiada, ransomware/malware confirmado, falha parcial relevante de autenticacao, impacto financeiro direto.
- `SEV-3`: degradacao de seguranca sem exploracao confirmada, componente externo fora do SLA, falha isolada com mitigacao rapida.
- `SEV-4`: evento sem impacto real no cliente, falso positivo ou ajuste operacional.

## RACI

- `Incident Commander`: lidera decisao, define prioridade, aprova comunicacao.
- `Engineering Owner`: executa mitigacao tecnica e valida restauracao.
- `Security Owner`: preserva evidencias, avalia escopo, conduz analise de causa.
- `Support/Success`: coordena comunicacao com clientes e atualizacoes externas.
- `Legal/DPO`: avalia obrigacao de notificacao regulatoria e impacto LGPD.

## Fluxo

1. Abrir incidente com horario, sintoma, escopo inicial e severidade.
2. Preservar evidencias: logs, request IDs, queries, alertas, dumps e hashes relevantes.
3. Conter o risco: revogar sessoes, rotacionar segredos, bloquear rotas, pausar integrações ou colocar manutencao.
4. Erradicar a causa: corrigir codigo, ajustar configuracao, remover artefatos maliciosos.
5. Recuperar com validacao: smoke test, health interno, verificacao de tenant e monitoramento reforcado.
6. Comunicar status conforme a severidade e registrar todas as decisoes.
7. Concluir com postmortem em ate 5 dias uteis.

## Comunicacao

- `SEV-1`: atualizar stakeholders internos em ate 15 minutos e clientes impactados assim que houver escopo minimo confiavel.
- `SEV-2`: atualizar stakeholders internos em ate 30 minutos e clientes impactados no mesmo dia.
- `SEV-3`: comunicar internamente no expediente e externamente se houver impacto perceptivel.
- `SEV-4`: registrar no backlog operacional.

## Checklists de contencao

### Conta comprometida

1. Revogar `refresh_tokens`.
2. Forcar reset de senha.
3. Revisar `last_seen_ip`, localizacao, mudancas de perfil e eventos administrativos.
4. Revalidar MFA do usuario.

### Indicacao de bypass multi-tenant

1. Colocar a rota em manutencao ou bloquear no gateway.
2. Rodar `npm run audit:tenant --prefix backend`.
3. Revisar logs por `request_id`, `user_id`, recurso e tenant afetado.
4. Validar escopo de leitura/escrita antes de reabrir.

### Malware em upload

1. Bloquear o hash/assinatura detectada.
2. Remover o objeto do storage.
3. Revisar acessos e downloads relacionados.
4. Validar logs e webhook de alerta.

## Evidencias minimas

- horario UTC e local;
- request IDs;
- usuarios, IPs e tenants envolvidos;
- hash do artefato ou payload relevante;
- estado antes/depois da mitigacao;
- aprovadores das decisoes criticas.

## Pos-incidente

1. Atualizar backlog de hardening.
2. Revisar monitoramento e testes automatizados.
3. Registrar lições aprendidas e owner com prazo.
