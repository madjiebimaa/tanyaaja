'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { InfoCircledIcon } from '@radix-ui/react-icons'

import { valibotResolver } from '@hookform/resolvers/valibot'
import { User } from 'firebase/auth'
import { maxLength, minLength, object, type Output, string } from 'valibot'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
// @ts-ignore
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  getCheckChatId,
  patchUpdateChannelNotif,
  postAddNewChannelNotif,
} from '@/lib/api'
import { trackEvent } from '@/lib/firebase'
import { NotifChannel, UserProfile } from '@/lib/types'

const schema = object({
  username: string('Username perlu disi terlebih dahulu.', [
    minLength(2, 'Username butuh paling tidak 2 karakter.'),
    maxLength(500, 'Username hanya bisa maksimal 1000 karakter.'),
  ]),
  chatId: string('Chat ID perlu disi terlebih dahulu.', [
    minLength(2, 'Chat ID butuh paling tidak 2 karakter.'),
    maxLength(20, 'Chat ID hanya bisa maksimal 20 karakter.'),
  ]),
})

type FormValues = Output<typeof schema>

export default function SettingTelegram({
  isLoading,
  owner,
  user,
  existing,
}: {
  isLoading: boolean
  owner: UserProfile | null | undefined
  user: User | null
  existing: NotifChannel[] | null | undefined
}) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const form = useForm<FormValues>({
    resolver: valibotResolver(schema),
    defaultValues: {
      username: '',
      chatId: '',
    },
  })

  const watchUsername = form.watch('username')

  async function onSubmit(data: FormValues) {
    trackEvent('click update notif channel telegram')
    if (user) {
      setIsSubmitting(true)
      try {
        if (existing && existing.length > 0) {
          // patch
          await patchUpdateChannelNotif(user, {
            uid: user?.uid,
            slug: owner?.slug || '',
            telegram_chat_id: data?.chatId || '',
            telegram_username: data?.username,
          })
          toast({
            title: 'Perubahan berhasil disimpan',
            description: `Berhasil menyimpan perubahan setelan notifikasi ke Telegram!`,
          })
        } else {
          // create
          await postAddNewChannelNotif(user, {
            uid: user?.uid,
            slug: owner?.slug || '',
            telegram_chat_id: data?.chatId || '',
            telegram_username: data?.username,
          })
          toast({
            title: 'Perubahan berhasil disimpan',
            description: `Berhasil menyimpan perubahan notifikasi ke Telegram!`,
          })
        }
      } catch (err) {
        toast({
          title: 'Gagal menyimpan',
          description: `Gagal saat mencoba menyimpan data, silahkan coba beberapa saat lagi!`,
        })
      }
      setIsSubmitting(false)
    }
  }

  async function handleCheckChatId() {
    if (user) {
      setIsSubmitting(true)
      try {
        const res = await getCheckChatId(user, form.getValues('username'))
        form.setValue('chatId', `${res?.data?.message?.chat?.id || ''}`)
      } catch (error) {
        toast({
          title: 'Gagal mengambil chat id',
          description: `Gagal saat mencoba chat id, silahkan coba beberapa saat lagi!`,
        })
      }
    }
    setIsSubmitting(false)
  }

  useEffect(() => {
    if (existing && existing.length > 0) {
      form.setValue('username', existing[0].telegram_username)
      form.setValue('chatId', existing[0].telegram_chat_id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing])

  return (
    <div className="w-full flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0 mt-4">
      <section className="flex-1 lg:max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username Telegram</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Isi dengan username Telegram"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Tidak perlu menambahkan karakter @ di depan username
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert className="mb-4">
              <InfoCircledIcon className="h-4 w-4" />
              <AlertTitle>Tips!</AlertTitle>
              <AlertDescription>
                <ul className="list-disc">
                  <li className="m-0">
                    <div className="flex items-center gap-2">
                      Kamu perlu mengisi username untuk mendapatkan chat id
                    </div>
                  </li>
                  <li className="m-0">
                    <div className="flex items-center gap-2">
                      Kirimkan perintah{' '}
                      <code className="text-blue-400">/start</code> ke{' '}
                      <code className="text-blue-400">@tanyaajabot</code> di
                      Telegram
                    </div>
                  </li>
                  <li className="m-0">
                    <div className="flex items-center gap-2">
                      Tekan tombol "Ambil Chat ID" setelah mengirimkan perintah{' '}
                      <code className="text-blue-400">/start</code>
                    </div>
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1">
                <FormField
                  control={form.control}
                  name="chatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chat ID Target</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Isi dengan target Chat ID"
                          disabled={!watchUsername}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="w-[150px]">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!watchUsername || isSubmitting || isLoading}
                  onClick={handleCheckChatId}
                >
                  Ambil Chat ID
                </Button>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting ? 'Processing' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </Form>
      </section>
    </div>
  )
}
