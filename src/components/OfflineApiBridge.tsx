'use client';

import { useEffect } from 'react';
import { installOfflineApiBridge } from '@/lib/offline-api';

/**
 * OfflineApiBridge — офлайн-шим API для статического экспорта (Pages).
 *
 * До Task 158 этот компонент вливался в собранный бандл деплой-скриптом
 * рабочей машины. Теперь он в исходниках и включается флагом сборки
 * NEXT_PUBLIC_OFFLINE_API_BRIDGE=1: серверная сборка не определяет флаг,
 * мост не ставится — настоящие роуты работают как раньше.
 * Рендерит null, живёт только эффектом установки перехватчика fetch.
 */
export function OfflineApiBridge() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_OFFLINE_API_BRIDGE === '1') {
      installOfflineApiBridge();
    }
  }, []);

  return null;
}
