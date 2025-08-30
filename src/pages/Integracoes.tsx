
// import { useEffect, useState, useCallback } from 'react';
// import { QrCode, CircleDot, PlusCircle, Power, AlertTriangle, Loader2, Wifi } from 'lucide-react';
// import { toast } from "sonner";
// import { supabase } from '@/lib/supabase';
// import { useProfile } from '@/hooks/useProfile';

// // Componentes da UI
// import { 
//   Breadcrumb, 
//   BreadcrumbList, 
//   BreadcrumbItem, 
//   BreadcrumbPage 
// } from '@/components/ui/breadcrumb';
// import {
//   Card, 
//   CardContent, 
//   CardHeader, 
//   CardTitle, 
//   CardDescription, 
//   CardFooter
// } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Skeleton } from '@/components/ui/skeleton';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogClose
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";

// // Tipos para o status simplificado
// type SimplifiedStatus = 'connected' | 'connecting' | 'disconnected' | 'unknown';

// interface InstanceStatusResponse {
//   message: string;
//   status: SimplifiedStatus;
//   wuzapiData: any;
// }

// const Integracoes = () => {
//   console.log("Integracoes component rendered");
//   const { user, profile, loading: profileLoading, error: profileError } = useProfile();

//   const [instanceData, setInstanceData] = useState<InstanceStatusResponse | null>(null);
//   const [instanceLoading, setInstanceLoading] = useState(true);
//   const [instanceError, setInstanceError] = useState<string | null>(null);

//   const [userInstanceToken, setUserInstanceToken] = useState<string | null>(null);
//   const [workspaceId, setWorkspaceId] = useState<number | null>(null);

//   // Estado para o Modal de Criação
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [newInstancePhone, setNewInstancePhone] = useState("");
//   const [isCreating, setIsCreating] = useState(false);
//   const [modalError, setModalError] = useState<string | null>(null);

//   // Funções para chamar as Serverless Functions
//   const callApi = useCallback(async (endpoint: string, data: any) => {
//     console.log(`callApi: Calling /api/wuzapi/${endpoint} with data:`, data);
//     const response = await fetch(`/api/wuzapi/${endpoint}`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(data),
//     });
//     if (!response.ok) {
//       const errorData = await response.json();
//       console.error(`callApi: Error response from /api/wuzapi/${endpoint}:`, errorData);
//       throw new Error(errorData.error || 'Erro na comunicação com a API.');
//     }
//     console.log(`callApi: Successful response from /api/wuzapi/${endpoint}`);
//     return response.json();
//   }, []);

//   // Função para buscar o workspace_id e o instanceToken do usuário
//   const fetchUserInstance = useCallback(async () => {
//     console.log("fetchUserInstance: Starting...");
//     if (!user) {
//       console.log("fetchUserInstance: User not available yet.");
//       return;
//     }

//     setInstanceLoading(true);
//     setInstanceError(null);

//     try {
//       // 1. Buscar o workspace_id do usuário
//       console.log("fetchUserInstance: Querying workspaces table for user:", user.id);
//       const { data: workspaceData, error: workspaceError } = await supabase
//         .from('workspaces')
//         .select('id')
//         .eq('owner_id', user.id)
//         .single();

//       if (workspaceError) {
//         console.error("fetchUserInstance: Error fetching workspace:", workspaceError);
//         throw new Error(workspaceError.message || 'Erro ao buscar workspace.');
//       }
//       if (!workspaceData) {
//         console.log("fetchUserInstance: No workspace data found.");
//         setInstanceError("Nenhum workspace encontrado para este usuário.");
//         setInstanceLoading(false);
//         return;
//       }
//       console.log("fetchUserInstance: Workspace data found:", workspaceData);
//       setWorkspaceId(workspaceData.id);

//       // 2. Buscar a instância do usuário na tabela user_instances
//       console.log("fetchUserInstance: Querying user_instances table for workspace:", workspaceData.id);
//       const { data: instanceDbData, error: instanceDbError } = await supabase
//         .from('user_instances')
//         .select('token')
//         .eq('workspace_id', workspaceData.id)
//         .single();

//       if (instanceDbError && instanceDbError.code !== 'PGRST116') { // PGRST116 = no rows found
//         console.error("fetchUserInstance: Error fetching user instance from DB:", instanceDbError);
//         throw new Error(instanceDbError.message || 'Erro ao buscar instância do usuário.');
//       }

//       if (instanceDbData) {
//         console.log("fetchUserInstance: Instance found in DB:", instanceDbData);
//         setUserInstanceToken(instanceDbData.token);
//         // 3. Se encontrou, buscar o status da Wuzapi
//         console.log("fetchUserInstance: Calling get-status API for token:", instanceDbData.token);
//         const statusResponse: InstanceStatusResponse = await callApi('get-status', { instanceToken: instanceDbData.token });
//         console.log("fetchUserInstance: Status response from get-status API:", statusResponse);
//         setInstanceData(statusResponse);
//       } else {
//         console.log("fetchUserInstance: No instance found in DB for this workspace.");
//         setUserInstanceToken(null);
//         setInstanceData(null);
//       }

//     } catch (err: any) {
//       console.error("fetchUserInstance: Caught error:", err);
//       setInstanceError(err.message || "Erro ao carregar dados da instância.");
//     } finally {
//       console.log("fetchUserInstance: Finally block - setting instanceLoading to false.");
//       setInstanceLoading(false);
//     }
//   }, [user, callApi]);

//   useEffect(() => {
//     console.log("useEffect: Running. user:", user, "profileLoading:", profileLoading);
//     if (user && !profileLoading) {
//       fetchUserInstance();
//     }
//   }, [user, profileLoading, fetchUserInstance]);

//   // Lógica de Criação de Instância
//   const handleCreateInstance = async () => {
//     console.log("handleCreateInstance: Starting...");
//     if (!newInstancePhone) {
//       setModalError("O número de telefone é obrigatório.");
//       console.log("handleCreateInstance: Phone number is empty.");
//       return;
//     }
    
//     setIsCreating(true);
//     setModalError(null);

//     try {
//       console.log("handleCreateInstance: Calling create-instance API.");
//       // 1. Criar instância na Wuzapi via Serverless Function
//       const wuzapiCreateResponse = await callApi('create-instance', { instancePhoneNumber: newInstancePhone });
//       console.log("handleCreateInstance: Wuzapi Create Response:", wuzapiCreateResponse);

//       // 2. Salvar no Supabase (user_instances)
//       if (!workspaceId) {
//         console.error("handleCreateInstance: Workspace ID not found for saving instance.");
//         throw new Error("Workspace ID não encontrado para salvar a instância.");
//       }
//       console.log("handleCreateInstance: Inserting into user_instances table.");
//       const { error: dbInsertError } = await supabase
//         .from('user_instances')
//         .insert({
//           instance_id: newInstancePhone, // Usando o número como ID
//           name: newInstancePhone,
//           token: newInstancePhone,
//           workspace_id: workspaceId,
//           status: 'disconnected', // Status inicial
//         });

//       if (dbInsertError) {
//         console.error("handleCreateInstance: Error inserting into DB:", dbInsertError);
//         throw new Error(dbInsertError.message || 'Erro ao salvar instância no banco de dados.');
//       }
//       console.log("handleCreateInstance: Instance saved to DB.");

//       toast.success("Instância criada com sucesso!", {
//         description: `A instância para o número ${newInstancePhone} foi registrada.`,
//       });
//       setIsModalOpen(false);
//       setNewInstancePhone("");
//       fetchUserInstance(); // Re-busca os dados para atualizar a UI
//     } catch (err: any) {
//       console.error("handleCreateInstance: Caught error:", err);
//       setModalError(err.message || "Ocorreu um erro desconhecido ao criar a instância.");
//     } finally {
//       console.log("handleCreateInstance: Finally block - setting isCreating to false.");
//       setIsCreating(false);
//     }
//   };

//   // Lógica de Conexão de Instância
//   const handleConnectInstance = async () => {
//     console.log("handleConnectInstance: Starting...");
//     if (!userInstanceToken) {
//       console.log("handleConnectInstance: No instance token available.");
//       return;
//     }

//     setInstanceLoading(true);
//     setInstanceError(null);

//     try {
//       console.log("handleConnectInstance: Calling connect-instance API.");
//       const connectResponse = await callApi('connect-instance', { instanceToken: userInstanceToken });
//       console.log("handleConnectInstance: Connect API response:", connectResponse);
//       toast.success("Comando de conexão enviado!", {
//         description: connectResponse.message || "Verifique o status da instância em breve.",
//       });
//       // Após conectar, re-buscar o status para atualizar a UI
//       fetchUserInstance(); 
//     } catch (err: any) {
//       console.error("handleConnectInstance: Caught error:", err);
//       setInstanceError(err.message || "Erro ao tentar conectar a instância.");
//     } finally {
//       console.log("handleConnectInstance: Finally block - setting instanceLoading to false.");
//       setInstanceLoading(false);
//     }
//   };

//   // Funções de status para o Badge
//   const getStatusVariant = (status: SimplifiedStatus) => {
//     switch (status) {
//       case 'connected': return "success";
//       case 'connecting': return "warning";
//       case 'disconnected': return "destructive";
//       default: return "secondary";
//     }
//   };

//   const getStatusText = (status: SimplifiedStatus) => {
//     switch (status) {
//       case 'connected': return "Conectado";
//       case 'connecting': return "Conectando...";
//       case 'disconnected': return "Desconectado";
//       default: return "Desconhecido";
//     }
//   };

//   // Renderização
//   if (profileLoading || instanceLoading) {
//     console.log("Render: Showing loading skeleton. profileLoading:", profileLoading, "instanceLoading:", instanceLoading);
//     return (
//       <div className="space-y-6">
//         <Breadcrumb>
//           <BreadcrumbList><BreadcrumbItem><BreadcrumbPage>Integrações</BreadcrumbPage></BreadcrumbItem></BreadcrumbList>
//         </Breadcrumb>
//         <h1 className="text-3xl font-bold text-foreground">Integração com WhatsApp</h1>
//         <p className="text-muted-foreground mt-1">Gerencie suas instâncias de conexão com o WhatsApp.</p>
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {[...Array(1)].map((_, i) => (
//             <Card key={i}>
//               <CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardHeader>
//               <CardContent><Skeleton className="h-4 w-full" /></CardContent>
//               <CardFooter className="gap-2"><Skeleton className="h-10 w-full" /></CardFooter>
//             </Card>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   if (profileError || instanceError) {
//     console.log("Render: Showing error card. profileError:", profileError, "instanceError:", instanceError);
//     return (
//       <div className="space-y-6">
//         <Breadcrumb>
//           <BreadcrumbList><BreadcrumbItem><BreadcrumbPage>Integrações</BreadcrumbPage></BreadcrumbItem></BreadcrumbList>
//         </Breadcrumb>
//         <h1 className="text-3xl font-bold text-foreground">Integração com WhatsApp</h1>
//         <p className="text-muted-foreground mt-1">Gerencie suas instâncias de conexão com o WhatsApp.</p>
//         <Card className="w-full bg-destructive/10 border-destructive/50">
//           <CardHeader className="flex-row items-center gap-4">
//             <AlertTriangle className="h-8 w-8 text-destructive" />
//             <div>
//               <CardTitle className="text-destructive">Erro de Carregamento</CardTitle>
//               <CardDescription className="text-destructive/90">{profileError?.message || instanceError}</CardDescription>
//             </div>
//           </CardHeader>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       <Breadcrumb>
//         <BreadcrumbList>
//           <BreadcrumbItem><BreadcrumbPage>Integrações</BreadcrumbPage></BreadcrumbItem>
//         </BreadcrumbList>
//       </Breadcrumb>

//       <div className="flex justify-between items-start">
//         <div>
//           <h1 className="text-3xl font-bold text-foreground">Integração com WhatsApp</h1>
//           <p className="text-muted-foreground mt-1">Gerencie suas instâncias de conexão com o WhatsApp.</p>
//         </div>
        
//         {!userInstanceToken && (
//           <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
//             <DialogTrigger asChild>
//               <Button><PlusCircle className="mr-2 h-4 w-4" /> Nova Instância</Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-[425px]">
//               <DialogHeader>
//                 <DialogTitle>Criar Nova Instância</DialogTitle>
//                 <DialogDescription>
//                   Insira o número de WhatsApp que você deseja conectar. Este número será usado como nome e token da sua instância.
//                 </DialogDescription>
//               </DialogHeader>
//               <div className="grid gap-4 py-4">
//                 <div className="grid grid-cols-4 items-center gap-4">
//                   <Label htmlFor="phone-number" className="text-right">Número</Label>
//                   <Input 
//                     id="phone-number" 
//                     placeholder="5511999998888" 
//                     className="col-span-3" 
//                     value={newInstancePhone}
//                     onChange={(e) => setNewInstancePhone(e.target.value)}
//                   />
//                 </div>
//                 {modalError && (
//                   <p className="text-sm text-red-500 col-span-4 text-center">{modalError}</p>
//                 )}
//               </div>
//               <DialogFooter>
//                 <DialogClose asChild>
//                   <Button variant="outline">Cancelar</Button>
//                 </DialogClose>
//                 <Button onClick={handleCreateInstance} disabled={isCreating}>
//                   {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
//                   Criar Instância
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         )}
//       </div>

//       {userInstanceToken && instanceData && (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           <Card>
//             <CardHeader>
//               <div className="flex justify-between items-center">
//                 <CardTitle className="font-bold">{userInstanceToken}</CardTitle>
//                 <Badge variant={getStatusVariant(instanceData.status)}>{getStatusText(instanceData.status)}</Badge>
//               </div>
//               <CardDescription>
//                 {instanceData.wuzapiData?.jid || 'N/A'}
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               <p className="text-sm text-muted-foreground">
//                 Plataforma: {instanceData.wuzapiData?.platform || 'N/A'}
//               </p>
//               {instanceData.status === 'disconnected' && (
//                 <p className="text-sm text-muted-foreground mt-2 flex items-center">
//                   <Wifi className="h-4 w-4 mr-1 text-destructive" /> Instância desconectada. Conecte para usar.
//                 </p>
//               )}
//               {instanceData.status === 'connecting' && (
//                 <p className="text-sm text-muted-foreground mt-2 flex items-center">
//                   <QrCode className="h-4 w-4 mr-1 text-primary" /> Escaneie o QR Code para conectar.
//                 </p>
//               )}
//             </CardContent>
//             <CardFooter className="flex justify-end gap-2">
//               {instanceData.status === 'disconnected' && (
//                 <Button onClick={handleConnectInstance} disabled={instanceLoading} size="sm">
//                   {instanceLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
//                   Conectar
//                 </Button>
//               )}
//               {instanceData.status === 'connecting' && (
//                 <Button variant="outline" size="sm">
//                   <QrCode className="mr-2 h-4 w-4" /> Gerar QR Code
//                 </Button>
//               )}
//               {instanceData.status === 'connected' && (
//                 <Button variant="destructive" size="sm">
//                   <Power className="mr-2 h-4 w-4" /> Desconectar
//                 </Button>
//               )}
//               {/* Botão de Status, sempre visível se houver instância */}
//               <Button variant="outline" size="sm" onClick={fetchUserInstance} disabled={instanceLoading}>
//                 {instanceLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
//                 <CircleDot className="mr-2 h-4 w-4" /> Atualizar Status
//               </Button>
//             </CardFooter>
//           </Card>
//         </div>
//       )}

//       {!userInstanceToken && !instanceLoading && !instanceError && (
//         <div className="flex items-center justify-center min-h-[400px]">
//           <Card className="w-full max-w-md text-center">
//             <CardHeader>
//               <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <Wifi className="h-8 w-8 text-primary" />
//               </div>
//               <CardTitle className="text-xl">Nenhuma Instância Encontrada</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <p className="text-muted-foreground">
//                 Parece que você ainda não tem uma instância de WhatsApp configurada.
//               </p>
//               <p className="text-muted-foreground mt-2">
//                 Clique em "Nova Instância" para começar.
//               </p>
//             </CardContent>
//           </Card>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Integracoes;
