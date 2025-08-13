import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Hash, Users, Lock, Globe, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { roomsService } from '../../../services/rooms.service'

const createRoomForm = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  avatar: z.string().optional(),
  isPrivate: z.boolean(),
  maxMembers: z.number().min(0).max(1000),
})

type CreateRoomForm = z.infer<typeof createRoomForm>

export function CreateRoom() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [roomType, setRoomType] = useState<'public' | 'private'>('public')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting: formSubmitting, errors },
  } = useForm<CreateRoomForm>({ 
    resolver: zodResolver(createRoomForm),
    defaultValues: {
      isPrivate: false,
      maxMembers: 0,
    }
  })

  const watchedName = watch('name')

  async function handleCreateRoom(data: CreateRoomForm) {
    try {
      setIsSubmitting(true)
      const room = await roomsService.createRoom({
        ...data,
        isPrivate: roomType === 'private',
      })
      
      toast.success('Grupo criado com sucesso!')
      navigate(`/chat/room/${room.id}`)
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao criar grupo'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleRoomTypeChange(type: 'public' | 'private') {
    setRoomType(type)
    setValue('isPrivate', type === 'private')
  }

  return (
    <>
      <Helmet title="Criar Grupo" />
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Criar Novo Grupo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Crie um espaço para conversar com seus amigos
          </p>
        </div>

        <form onSubmit={handleSubmit(handleCreateRoom)} className="space-y-6">

          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Tipo do Grupo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleRoomTypeChange('public')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  roomType === 'public'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Globe className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${
                  roomType === 'public' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <h3 className="font-medium mb-1 text-sm sm:text-base">Público</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Qualquer pessoa pode entrar
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleRoomTypeChange('private')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  roomType === 'private'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Lock className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 ${
                  roomType === 'private' ? 'text-blue-500' : 'text-gray-400'
                }`} />
                <h3 className="font-medium mb-1 text-sm sm:text-base">Privado</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Apenas por convite
                </p>
              </button>
            </div>
          </div>


          <div className="bg-white dark:bg-gray-800 rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-semibold">Detalhes do Grupo</h2>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do Grupo *</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="meu-grupo-incrivel"
                  {...register('name')}
                  className="pl-10"
                />
              </div>
              {errors.name && (
                <span className="text-xs text-red-500">{errors.name.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva sobre o que é este grupo..."
                {...register('description')}
                rows={3}
              />
              {errors.description && (
                <span className="text-xs text-red-500">{errors.description.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMembers">Limite de Membros</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="maxMembers"
                  type="number"
                  placeholder="0 = ilimitado"
                  {...register('maxMembers', { valueAsNumber: true })}
                  className="pl-10"
                  min="0"
                  max="1000"
                />
              </div>
              {errors.maxMembers && (
                <span className="text-xs text-red-500">{errors.maxMembers.message}</span>
              )}
              <p className="text-xs text-gray-500">
                Digite 0 para permitir membros ilimitados
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar do Grupo (URL)</Label>
              <div className="relative">
                <Upload className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="avatar"
                  type="url"
                  placeholder="https://exemplo.com/avatar.jpg"
                  {...register('avatar')}
                  className="pl-10"
                />
              </div>
            </div>
          </div>


          {watchedName && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Pré-visualização</h2>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-10 h-10 bg-blue-500 rounded-md flex items-center justify-center text-white text-sm font-medium">
                  <Hash className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {watchedName}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {roomType === 'private' ? (
                      <><Lock className="h-3 w-3" /> Privado</>
                    ) : (
                      <><Globe className="h-3 w-3" /> Público</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}


          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || formSubmitting}
            >
              {isSubmitting ? 'Criando...' : 'Criar Grupo'}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
