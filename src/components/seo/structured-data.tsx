import { useEffect } from 'react';

interface StructuredDataProps {
  id: string;
  data: Record<string, unknown> | Record<string, unknown>[];
}

export function StructuredData({ id, data }: StructuredDataProps) {
  useEffect(() => {
    const scriptId = `jsonld-${id}`;
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = scriptId;
    script.text = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      const mountedScript = document.getElementById(scriptId);
      if (mountedScript) mountedScript.remove();
    };
  }, [id, data]);

  return null;
}
