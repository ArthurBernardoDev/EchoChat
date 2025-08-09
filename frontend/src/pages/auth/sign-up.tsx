import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/auth.context'
import { toast } from 'sonner'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

const signUpForm = z.object({
  email: z.string().email('Informe um e-mail válido'),
  username: z.string().min(3, 'Username deve ter ao menos 3 caracteres'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

type SignUpForm = z.infer<typeof signUpForm>

export function SignUp() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<SignUpForm>({ resolver: zodResolver(signUpForm) })

  async function handleSignUp(data: SignUpForm) {
    try {
      console.log('Tentando registrar com:', data)
      await registerUser(data.email, data.username, data.password)
      toast.success('Conta criada com sucesso! Faça login para continuar.', {
        action: {
          label: 'Entrar',
          onClick: () => navigate('/sign-in'),
        },
      })
      navigate('/sign-in')
    } catch (error: any) {
      console.error('Erro no registro:', error)
      console.error('Response:', error.response)
      const errorMessage = error.response?.data?.message || 'Erro ao criar conta. Tente novamente.'
      toast.error(errorMessage, {
        action: {
          label: 'Reenviar',
          onClick: () => handleSignUp(data),
        },
      })
    }
  }

  return (
    <>
      <Helmet title="Cadastro" />
      <div className="p-8">
        <div className="flex w-[350px] flex-col justify-center gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tighter">Criar conta</h1>
            <p className="text-sm text-muted-foreground">Cadastre-se para acessar o EchoChat</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit(handleSignUp)}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <span className="text-xs text-red-500">{errors.email.message}</span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" {...register('username')} />
              {errors.username && (
                <span className="text-xs text-red-500">{errors.username.message}</span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <span className="text-xs text-red-500">{errors.password.message}</span>
              )}
            </div>
            <Button disabled={isSubmitting} type="submit" className="w-full">
              Criar conta
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link className="text-foreground underline" to="/sign-in">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  )
}


