import React from 'react';
import { useFormContext } from 'react-hook-form';
import type { AgentForm } from '~/common';
import { useLocalize } from '~/hooks';
import { Controller } from 'react-hook-form';

const labelClass = 'mb-1 block text-sm text-token-text-primary';
const inputClass = 'flex w-full rounded border border-border-light px-3 py-2 bg-surface-primary text-sm';

interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'select';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string;
}

interface InjectorDefinition {
  id: string;
  name: string;
  description: string;
  defaultConfig?: Record<string, unknown>;
  configFields: ConfigField[];
}

const INJECTOR_DEFINITIONS: InjectorDefinition[] = [
  {
    id: 'current_date',
    name: 'Current Date/Time',
    description: 'Inject the current date and time into the conversation',
    defaultConfig: { format: 'full' },
    configFields: [
      {
        name: 'format',
        label: 'Format',
        type: 'select',
        defaultValue: 'full',
        options: [
          { value: 'full', label: 'Full (date and time)' },
          { value: 'date_only', label: 'Date only' },
          { value: 'time_only', label: 'Time only' },
          { value: 'iso', label: 'ISO format' },
        ],
      },
      {
        name: 'timezone',
        label: 'Timezone',
        type: 'text',
        placeholder: 'Auto-detect from browser',
      },
    ],
  },
  {
    id: 'time_since_last_message',
    name: 'Time Since Last Message',
    description: 'Inject time elapsed since your last message',
    defaultConfig: { format: 'human' },
    configFields: [
      {
        name: 'format',
        label: 'Format',
        type: 'select',
        defaultValue: 'human',
        options: [
          { value: 'human', label: 'Human readable (e.g., "2 hours")' },
          { value: 'seconds', label: 'Seconds' },
        ],
      },
      {
        name: 'firstMessageText',
        label: 'First Message Text',
        type: 'text',
        placeholder: 'This is the first message...',
      },
    ],
  },
  {
    id: 'device_type',
    name: 'Device Type',
    description: 'Inject information about your device',
    defaultConfig: { format: 'device_os' },
    configFields: [
      {
        name: 'format',
        label: 'Detail Level',
        type: 'select',
        defaultValue: 'device_os',
        options: [
          { value: 'full', label: 'Full (user agent string)' },
          { value: 'device_os', label: 'Device and OS' },
          { value: 'device', label: 'Device only' },
          { value: 'simple', label: 'Simple (Desktop/Mobile/Unknown)' },
        ],
      },
    ],
  },
];

export default function PromptInjection() {
  const localize = useLocalize();
  const { control } = useFormContext<AgentForm>();

  return (
    <div className="mb-4">
      <div className="mb-3 flex items-center gap-2">
        <label className="text-token-text-primary block font-medium">
          {localize('com_agents_prompt_injection')}
        </label>
      </div>
      <p className="mb-4 text-sm text-text-secondary">
        {localize('com_agents_prompt_injection_description')}
      </p>

      {INJECTOR_DEFINITIONS.map((injector) => {
        return (
          <div key={injector.id} className="mb-3 rounded-lg border border-border-light bg-surface-primary p-3">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-token-text-primary">{injector.name}</div>
                <div className="text-sm text-text-secondary">{injector.description}</div>
              </div>
              <Controller
                name={`prompt_injection.${injector.id}.enabled`}
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={field.value ?? false}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-border-light"
                  />
                )}
              />
            </div>

            <Controller
              name={`prompt_injection.${injector.id}.enabled`}
              control={control}
              render={({ field }) =>
                field.value ? (
                  <div className="mt-3 space-y-3 border-t border-border-light pt-3">
                    {injector.configFields.map((configField) => (
                      <div key={configField.name}>
                        <label className={labelClass}>{configField.label}</label>
                        <Controller
                          name={`prompt_injection.${injector.id}.config.${configField.name}`}
                          control={control}
                          defaultValue={configField.defaultValue ?? ''}
                          render={({ field: configFieldProps }) =>
                            configField.type === 'select' ? (
                              <select
                                {...configFieldProps}
                                value={configFieldProps.value ?? configField.defaultValue ?? ''}
                                className={inputClass}
                              >
                                {configField.options?.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                {...configFieldProps}
                                value={configFieldProps.value ?? ''}
                                placeholder={configField.placeholder ?? ''}
                                className={inputClass}
                              />
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : null
              }
            />
          </div>
        );
      })}
    </div>
  );
}
