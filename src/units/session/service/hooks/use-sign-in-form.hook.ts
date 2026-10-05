import { schemaResolver, useForm } from '@mantine/form';

import { SharedConfig, SharedLib } from '@shared';

import {
  type CredentialsFormValues,
  credentialsFormSchema,
} from '../../model/validation/credentials.schema';
import { useSignInMutation } from '../mutations/sign-in.mutation';
import { useMessengerPreferenceStore } from '../stores/messenger-preference.store';

/** Login form: messenger choice, field validation, the instance check and the error to show. */
export function useSignInForm({ onSignedIn }: { onSignedIn: () => void }) {
  const messenger = useMessengerPreferenceStore((state) => state.messenger);
  const setMessenger = useMessengerPreferenceStore((state) => state.setMessenger);
  const signIn = useSignInMutation();

  const form = useForm<CredentialsFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      idInstance: '',
      apiTokenInstance: '',
      apiUrl: SharedConfig.MESSENGERS[messenger].defaultApiUrl,
    },
    validate: schemaResolver(credentialsFormSchema, { sync: true }),
  });

  const onMessengerChange = (value: string) => {
    const next = SharedConfig.MESSENGER_IDS.find((id) => id === value);
    if (!next) return;
    // Swap the suggested host only if the user has not typed their own.
    if (form.getValues().apiUrl === SharedConfig.MESSENGERS[messenger].defaultApiUrl) {
      form.setFieldValue('apiUrl', SharedConfig.MESSENGERS[next].defaultApiUrl);
    }
    setMessenger(next);
  };

  const onSubmit = form.onSubmit((values) => {
    const credentials = credentialsFormSchema.parse(values);
    signIn.mutate({ messenger, ...credentials }, { onSuccess: onSignedIn });
  });

  return {
    form,
    messenger,
    messengerOptions: SharedConfig.MESSENGER_IDS.map((id) => ({
      value: id,
      label: SharedConfig.MESSENGERS[id].label,
    })),
    onMessengerChange,
    onSubmit,
    isPending: signIn.isPending,
    error: signIn.error ? SharedLib.getErrorMessage(signIn.error) : null,
    consoleUrl: SharedConfig.GREEN_API_CONSOLE_URL,
  };
}
