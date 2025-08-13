import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/auth.context'
import { useUserProfile } from '../../contexts/user-profile.context'
import { userService } from '../../services/user.service'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { 
  User, 
  Lock, 
  Camera, 
  Circle,
  Save,
  X
} from 'lucide-react'

  import type { UserStatus } from '../../services/user.service'

const profileSchema = z.object({
  username: z.string().min(3, 'Username deve ter ao menos 3 caracteres').max(30, 'Username muito longo'),
  email: z.string().email('E-mail inválido'),
  bio: z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  newPassword: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

const statusOptions = [
  { value: 'ONLINE', label: 'Online', color: 'bg-green-500' },
  { value: 'IDLE', label: 'Ausente', color: 'bg-yellow-500' },
  { value: 'DO_NOT_DISTURB', label: 'Não Perturbe', color: 'bg-red-500' },
  { value: 'OFFLINE', label: 'Invisível', color: 'bg-gray-500' },
] as const

export function Profile() {
  const { logout, deleteAccount } = useAuth()
  const { profile: userProfile, updateProfile: updateUserProfile, updateStatus: updateUserStatus, isLoading } = useUserProfile()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
    reset: resetProfile,
  } = useForm<ProfileForm>({ 
    resolver: zodResolver(profileSchema),
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
    reset: resetPassword,
  } = useForm<PasswordForm>({ 
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (userProfile) {
      setAvatarPreview(userProfile.avatar)
      resetProfile({
        username: userProfile.username,
        email: userProfile.email,
        bio: userProfile.bio || '',
      })
    }
  }, [userProfile, resetProfile])

  async function handleUpdateProfile(data: ProfileForm) {
    try {
      await updateUserProfile({
        ...data,
        avatar: avatarPreview || undefined,
      })
      setIsEditingProfile(false)
      toast.success('Perfil atualizado com sucesso!')
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao atualizar perfil'
      toast.error(message)
    }
  }

  async function handleChangePassword(data: PasswordForm) {
    try {
      await userService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      resetPassword()
      setIsChangingPassword(false)
      toast.success('Senha alterada com sucesso!')
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao alterar senha'
      toast.error(message)
    }
  }

  async function handleUpdateStatus(status: UserStatus) {
    try {
      await updateUserStatus(status)
      toast.success('Status atualizado!')
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function cancelProfileEdit() {
    setIsEditingProfile(false)
    if (userProfile) {
      resetProfile({
        username: userProfile.username,
        email: userProfile.email,
        bio: userProfile.bio || '',
      })
      setAvatarPreview(userProfile.avatar)
    }
  }

  if (isLoading || !userProfile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <>
      <Helmet title="Meu Perfil" />
      <div className="container mx-auto max-w-4xl p-6">
        <h1 className="mb-8 text-3xl font-bold">Meu Perfil</h1>

        <div className="mb-8 rounded-lg border bg-card p-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-border bg-muted">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              {isEditingProfile && (
                <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/90">
                  <Camera className="h-4 w-4" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </label>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-semibold">{userProfile.username}</h2>
              <p className="text-muted-foreground">{userProfile.email}</p>
              
              <div className="mt-4">
                <Label>Status</Label>
                <div className="mt-2 flex gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleUpdateStatus(option.value)}
                      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent ${
                        userProfile.status === option.value ? 'bg-accent' : ''
                      }`}
                    >
                      <Circle className={`h-2 w-2 fill-current ${option.color}`} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Informações Pessoais</h3>
            {!isEditingProfile ? (
              <Button onClick={() => setIsEditingProfile(true)} variant="outline">
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={cancelProfileEdit} 
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {!isEditingProfile ? (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Username</Label>
                <p className="mt-1">{userProfile.username}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">E-mail</Label>
                <p className="mt-1">{userProfile.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Bio</Label>
                <p className="mt-1">{userProfile.bio || 'Nenhuma bio adicionada'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Membro desde</Label>
                <p className="mt-1">
                  {new Date(userProfile.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitProfile(handleUpdateProfile)} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  {...registerProfile('username')}
                />
                {profileErrors.username && (
                  <span className="text-xs text-red-500">{profileErrors.username.message}</span>
                )}
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input 
                  id="email" 
                  type="email"
                  {...registerProfile('email')}
                />
                {profileErrors.email && (
                  <span className="text-xs text-red-500">{profileErrors.email.message}</span>
                )}
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea 
                  id="bio" 
                  rows={4}
                  placeholder="Conte um pouco sobre você..."
                  {...registerProfile('bio')}
                />
                {profileErrors.bio && (
                  <span className="text-xs text-red-500">{profileErrors.bio.message}</span>
                )}
              </div>
              <Button type="submit" disabled={isSubmittingProfile}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </form>
          )}
        </div>

        <div className="mb-8 rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Segurança</h3>
            {!isChangingPassword && (
              <Button onClick={() => setIsChangingPassword(true)} variant="outline">
                Alterar Senha
              </Button>
            )}
          </div>

          {isChangingPassword ? (
            <form onSubmit={handleSubmitPassword(handleChangePassword)} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input 
                  id="currentPassword" 
                  type="password"
                  {...registerPassword('currentPassword')}
                />
                {passwordErrors.currentPassword && (
                  <span className="text-xs text-red-500">{passwordErrors.currentPassword.message}</span>
                )}
              </div>
              <div>
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input 
                  id="newPassword" 
                  type="password"
                  {...registerPassword('newPassword')}
                />
                {passwordErrors.newPassword && (
                  <span className="text-xs text-red-500">{passwordErrors.newPassword.message}</span>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input 
                  id="confirmPassword" 
                  type="password"
                  {...registerPassword('confirmPassword')}
                />
                {passwordErrors.confirmPassword && (
                  <span className="text-xs text-red-500">{passwordErrors.confirmPassword.message}</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmittingPassword}>
                  <Lock className="mr-2 h-4 w-4" />
                  Alterar Senha
                </Button>
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsChangingPassword(false)
                    resetPassword()
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-muted-foreground">
              Mantenha sua conta segura com uma senha forte.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <h3 className="mb-4 text-xl font-semibold text-destructive">Zona de Perigo</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Ações irreversíveis. Por favor, tenha certeza antes de prosseguir.
          </p>
          <Button 
            variant="destructive"
            onClick={async () => {
              if (confirm('Tem certeza que deseja EXCLUIR sua conta? Esta ação é irreversível e todos os seus dados serão perdidos permanentemente.')) {
                try {
                  await deleteAccount()
                  toast.success('Conta excluída com sucesso')
                } catch (error: any) {
                  console.error('Erro ao excluir conta:', error)
                  toast.error(error.response?.data?.message || 'Erro ao excluir conta')
                }
              }
            }}
          >
            Excluir Conta
          </Button>
        </div>
      </div>
    </>
  )
}
