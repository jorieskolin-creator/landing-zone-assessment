ALTER TABLE run_shadow_telemetry
  DROP CONSTRAINT IF EXISTS run_shadow_telemetry_analyzer_version_check,
  DROP CONSTRAINT IF EXISTS run_shadow_telemetry_scale_registry_version_check;

ALTER TABLE run_shadow_telemetry
  ADD CONSTRAINT run_shadow_telemetry_analyzer_version_check
  CHECK (analyzer_version IN ('tagging_allocation_v1@1.0.0', 'tagging_allocation_v1@1.2.0', 'tagging_allocation_v1@1.3.0',
                              'lz_azure_management_group_membership_v1@1.0.0')),
  ADD CONSTRAINT run_shadow_telemetry_scale_registry_version_check
  CHECK (scale_registry_version IN ('data_signal_registry_v1', 'data_signal_registry_v2', 'lz_data_signal_registry_v1'));
