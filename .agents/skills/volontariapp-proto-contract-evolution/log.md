# Historique

## 2026-10-06

- **Vérification** - event.proto: ajout additif Event.cover_file_id=16 et cover_status=17 (oubli du ticket 2.6), regles inchangees (claude-code/claude-sonnet-5-5)
- **Vérification** - ajout du piege proto-sync HEAD~1 (un seul commit regenere par push) et du secours proto-reset (claude-code/claude-sonnet-5-5)
- **Leçon** - proto-sync ne regenere que le dernier commit d'un push (rule) (claude-code/agent)
- **Vérification** - storage protos: ConfirmUpload, upload_fields, files, depreciations VerifyFilesExist et is_public, regles inchangees (claude-code/claude-sonnet-5-5)
- **Vérification** - post/event/user protos: ajouts additifs, reserved 5/location sur CreateEventCommand, depreciations, regles inchangees (claude-code/claude-sonnet-5-5)
- **Vérification** - storage.command/responses.proto: ajouts additifs (ConfirmUpload*, upload_fields, files, is_public deprecie), regles inchangees (claude-code/claude-sonnet-5-5)
- **Vérification** - storage.proto: ajouts additifs (enums, champs 12-15, is_public deprecie), regles et commandes inchangees (claude-code/claude-sonnet-5-5)
- **Vérification** - CI sans buf breaking, buf.yaml, structure et dette des numéros (claude-code/claude-opus-5-5)
- **Vérification** - migration au format OKF v0.2 (setup agentique repris d'Aureum, multi-repo) (claude-code/claude-opus-5-5)
