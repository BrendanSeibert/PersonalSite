import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../api/health';
import { useI18n } from '../context/I18nContext';
import './HealthStatus.scss';

export function HealthStatus() {
  const { t } = useI18n();
  const { isPending, isError } = useQuery({ queryKey: ['health'], queryFn: fetchHealth, retry: false });

  let status = t('health.ok');
  if (isPending) status = t('health.checking');
  else if (isError) status = t('health.unavailable');

  return (
    <p className="d-health-status health-status" role="status">
      {status}
    </p>
  );
}
