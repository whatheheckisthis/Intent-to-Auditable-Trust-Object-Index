# Ledger storage target

Configure `LEDGER_BACKEND=s3_object_lock` with `LEDGER_TARGET=bucket/prefix` for an S3 bucket that has Object Lock enabled in compliance mode, or configure `LEDGER_BACKEND=azure_immutable_blob` with `LEDGER_TARGET=container/prefix` for an Azure Blob container with an immutability policy. The runtime identity must have append/create permissions only; delete, overwrite, and retention-bypass permissions must be denied.
