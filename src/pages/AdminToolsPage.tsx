import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Home,
  Server,
  BookOpen,
  Calculator,
  Network,
  Binary,
  Clock,
  Hash,
  Copy,
  Check,
  Shuffle,
  Lock,
  FileText,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const AdminToolsPage = () => {
  // État pour les différents outils
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Calculateur de sous-réseau
  const [subnetInput, setSubnetInput] = useState("192.168.1.0/24");
  const [subnetResult, setSubnetResult] = useState<{
    network: string;
    broadcast: string;
    firstHost: string;
    lastHost: string;
    totalHosts: number;
    mask: string;
  } | null>(null);

  // Convertisseur de bases
  const [baseInput, setBaseInput] = useState("255");
  const [baseFrom, setBaseFrom] = useState<"dec" | "hex" | "bin">("dec");
  const [baseResults, setBaseResults] = useState<{ dec: string; hex: string; bin: string } | null>(null);

  // Générateur de mot de passe
  const [passwordLength, setPasswordLength] = useState(16);
  const [generatedPassword, setGeneratedPassword] = useState("");

  // Timestamp converter
  const [timestampInput, setTimestampInput] = useState("");
  const [timestampResult, setTimestampResult] = useState("");

  // Hash generator
  const [hashInput, setHashInput] = useState("");
  const [hashResults, setHashResults] = useState<{ md5: string; sha1: string; sha256: string } | null>(null);

  // Base64
  const [base64Input, setBase64Input] = useState("");
  const [base64Output, setBase64Output] = useState("");
  const [base64Mode, setBase64Mode] = useState<"encode" | "decode">("encode");

  // Chmod calculator
  const [chmodPerms, setChmodPerms] = useState({
    owner: { read: true, write: true, execute: false },
    group: { read: true, write: false, execute: false },
    others: { read: true, write: false, execute: false },
  });

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copié !");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Fonction de calcul de sous-réseau
  const calculateSubnet = () => {
    try {
      const [ip, cidr] = subnetInput.split("/");
      const cidrNum = parseInt(cidr);
      const ipParts = ip.split(".").map(Number);
      
      if (ipParts.length !== 4 || ipParts.some(p => p < 0 || p > 255) || cidrNum < 0 || cidrNum > 32) {
        toast.error("Adresse IP ou CIDR invalide");
        return;
      }

      const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
      const maskNum = cidrNum === 0 ? 0 : (-1 << (32 - cidrNum)) >>> 0;
      const networkNum = (ipNum & maskNum) >>> 0;
      const broadcastNum = (networkNum | (~maskNum >>> 0)) >>> 0;
      
      const numToIp = (num: number) => [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255,
      ].join(".");

      const totalHosts = Math.pow(2, 32 - cidrNum) - 2;

      setSubnetResult({
        network: numToIp(networkNum),
        broadcast: numToIp(broadcastNum),
        firstHost: numToIp(networkNum + 1),
        lastHost: numToIp(broadcastNum - 1),
        totalHosts: totalHosts > 0 ? totalHosts : 0,
        mask: numToIp(maskNum),
      });
    } catch {
      toast.error("Erreur de calcul");
    }
  };

  // Convertisseur de bases
  const convertBase = () => {
    try {
      let decValue: number;
      
      if (baseFrom === "dec") {
        decValue = parseInt(baseInput, 10);
      } else if (baseFrom === "hex") {
        decValue = parseInt(baseInput, 16);
      } else {
        decValue = parseInt(baseInput, 2);
      }

      if (isNaN(decValue)) {
        toast.error("Valeur invalide");
        return;
      }

      setBaseResults({
        dec: decValue.toString(10),
        hex: decValue.toString(16).toUpperCase(),
        bin: decValue.toString(2),
      });
    } catch {
      toast.error("Erreur de conversion");
    }
  };

  // Générateur de mot de passe
  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let password = "";
    for (let i = 0; i < passwordLength; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
  };

  // Timestamp converter
  const convertTimestamp = () => {
    try {
      const input = timestampInput.trim();
      
      // Si c'est un nombre, c'est un timestamp
      if (/^\d+$/.test(input)) {
        const ts = parseInt(input);
        const date = new Date(ts * (input.length > 10 ? 1 : 1000));
        setTimestampResult(`Date: ${date.toLocaleString("fr-FR")} (UTC: ${date.toUTCString()})`);
      } else {
        // Sinon, convertir la date en timestamp
        const date = new Date(input);
        if (isNaN(date.getTime())) {
          toast.error("Date invalide");
          return;
        }
        setTimestampResult(`Timestamp: ${Math.floor(date.getTime() / 1000)} (ms: ${date.getTime()})`);
      }
    } catch {
      toast.error("Erreur de conversion");
    }
  };

  // Hash generator (simple simulation - en production, utiliser une vraie lib crypto)
  const generateHash = async () => {
    if (!hashInput) {
      toast.error("Veuillez entrer du texte");
      return;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(hashInput);

    const sha256Buffer = await crypto.subtle.digest("SHA-256", data);
    const sha1Buffer = await crypto.subtle.digest("SHA-1", data);
    
    const hashArray = (buffer: ArrayBuffer) => 
      Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    setHashResults({
      md5: "Utiliser Web Crypto (non supporté)", // MD5 n'est pas dans Web Crypto
      sha1: hashArray(sha1Buffer),
      sha256: hashArray(sha256Buffer),
    });
  };

  // Base64
  const handleBase64 = () => {
    try {
      if (base64Mode === "encode") {
        setBase64Output(btoa(base64Input));
      } else {
        setBase64Output(atob(base64Input));
      }
    } catch {
      toast.error("Erreur de conversion Base64");
    }
  };

  // Chmod calculator
  const calculateChmod = () => {
    const calcValue = (perms: { read: boolean; write: boolean; execute: boolean }) =>
      (perms.read ? 4 : 0) + (perms.write ? 2 : 0) + (perms.execute ? 1 : 0);

    return `${calcValue(chmodPerms.owner)}${calcValue(chmodPerms.group)}${calcValue(chmodPerms.others)}`;
  };

  const togglePerm = (who: "owner" | "group" | "others", perm: "read" | "write" | "execute") => {
    setChmodPerms(prev => ({
      ...prev,
      [who]: {
        ...prev[who],
        [perm]: !prev[who][perm],
      },
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/home" className="p-2 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
              <Calculator className="h-6 w-6 text-primary" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Outils Admin</h1>
              <p className="text-sm text-muted-foreground">Boîte à outils pour administrateurs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/home">
                <Home className="h-4 w-4 mr-2" />
                Accueil
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/infra">
                <Server className="h-4 w-4 mr-2" />
                Infra Docs
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <BookOpen className="h-4 w-4 mr-2" />
                GitHub Docs
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Boîte à Outils Système</h2>
          <p className="text-muted-foreground">
            Outils essentiels pour les administrateurs système et réseau
          </p>
        </div>

        <Tabs defaultValue="network" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 p-2">
            <TabsTrigger value="network" className="gap-2">
              <Network className="h-4 w-4" />
              Réseau
            </TabsTrigger>
            <TabsTrigger value="convert" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Conversion
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="h-4 w-4" />
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <FileText className="h-4 w-4" />
              Système
            </TabsTrigger>
          </TabsList>

          {/* Outils Réseau */}
          <TabsContent value="network" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Calculateur de sous-réseau */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary" />
                    Calculateur de Sous-réseau
                  </CardTitle>
                  <CardDescription>
                    Calculez les informations d'un réseau à partir d'une adresse CIDR
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={subnetInput}
                      onChange={(e) => setSubnetInput(e.target.value)}
                      placeholder="192.168.1.0/24"
                    />
                    <Button onClick={calculateSubnet}>Calculer</Button>
                  </div>
                  
                  {subnetResult && (
                    <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Réseau:</span>
                        <span className="font-mono">{subnetResult.network}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Masque:</span>
                        <span className="font-mono">{subnetResult.mask}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Broadcast:</span>
                        <span className="font-mono">{subnetResult.broadcast}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Premier hôte:</span>
                        <span className="font-mono">{subnetResult.firstHost}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dernier hôte:</span>
                        <span className="font-mono">{subnetResult.lastHost}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">Hôtes disponibles:</span>
                        <span className="font-bold">{subnetResult.totalHosts.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Convertisseur de bases */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Binary className="h-5 w-5 text-primary" />
                    Convertisseur de Bases
                  </CardTitle>
                  <CardDescription>
                    Convertissez entre décimal, hexadécimal et binaire
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={baseInput}
                      onChange={(e) => setBaseInput(e.target.value)}
                      placeholder="Entrez une valeur"
                      className="flex-1"
                    />
                    <select
                      value={baseFrom}
                      onChange={(e) => setBaseFrom(e.target.value as "dec" | "hex" | "bin")}
                      className="px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="dec">DEC</option>
                      <option value="hex">HEX</option>
                      <option value="bin">BIN</option>
                    </select>
                    <Button onClick={convertBase}>Convertir</Button>
                  </div>

                  {baseResults && (
                    <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Décimal:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{baseResults.dec}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(baseResults.dec, "dec")}
                          >
                            {copiedField === "dec" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Hexadécimal:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">0x{baseResults.hex}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(`0x${baseResults.hex}`, "hex")}
                          >
                            {copiedField === "hex" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Binaire:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{baseResults.bin}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(baseResults.bin, "bin")}
                          >
                            {copiedField === "bin" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Outils de conversion */}
          <TabsContent value="convert" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Timestamp converter */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Convertisseur Timestamp
                  </CardTitle>
                  <CardDescription>
                    Convertissez entre timestamp Unix et date lisible
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={timestampInput}
                      onChange={(e) => setTimestampInput(e.target.value)}
                      placeholder="1704067200 ou 2024-01-01"
                    />
                    <Button onClick={convertTimestamp}>Convertir</Button>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      const now = Math.floor(Date.now() / 1000);
                      setTimestampInput(now.toString());
                      setTimestampResult(`Date: ${new Date().toLocaleString("fr-FR")}`);
                    }}
                  >
                    Timestamp actuel
                  </Button>
                  {timestampResult && (
                    <div className="bg-muted rounded-lg p-4">
                      <p className="font-mono text-sm">{timestampResult}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Base64 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-primary" />
                    Encodage Base64
                  </CardTitle>
                  <CardDescription>
                    Encodez ou décodez du texte en Base64
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={base64Mode === "encode" ? "default" : "outline"}
                      onClick={() => setBase64Mode("encode")}
                      className="flex-1"
                    >
                      Encoder
                    </Button>
                    <Button
                      variant={base64Mode === "decode" ? "default" : "outline"}
                      onClick={() => setBase64Mode("decode")}
                      className="flex-1"
                    >
                      Décoder
                    </Button>
                  </div>
                  <Textarea
                    value={base64Input}
                    onChange={(e) => setBase64Input(e.target.value)}
                    placeholder={base64Mode === "encode" ? "Texte à encoder..." : "Base64 à décoder..."}
                    rows={3}
                  />
                  <Button onClick={handleBase64} className="w-full">
                    {base64Mode === "encode" ? "Encoder" : "Décoder"}
                  </Button>
                  {base64Output && (
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-mono text-sm break-all flex-1">{base64Output}</p>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(base64Output, "base64")}
                        >
                          {copiedField === "base64" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Outils de sécurité */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Générateur de mot de passe */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shuffle className="h-5 w-5 text-primary" />
                    Générateur de Mot de Passe
                  </CardTitle>
                  <CardDescription>
                    Générez des mots de passe sécurisés aléatoires
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Longueur: {passwordLength} caractères</Label>
                    <input
                      type="range"
                      min="8"
                      max="64"
                      value={passwordLength}
                      onChange={(e) => setPasswordLength(parseInt(e.target.value))}
                      className="w-full mt-2"
                    />
                  </div>
                  <Button onClick={generatePassword} className="w-full">
                    <Shuffle className="h-4 w-4 mr-2" />
                    Générer
                  </Button>
                  {generatedPassword && (
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex justify-between items-center gap-2">
                        <code className="font-mono text-sm break-all flex-1">{generatedPassword}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(generatedPassword, "password")}
                        >
                          {copiedField === "password" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hash generator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-primary" />
                    Générateur de Hash
                  </CardTitle>
                  <CardDescription>
                    Générez des hash SHA-1 et SHA-256 d'un texte
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={hashInput}
                    onChange={(e) => setHashInput(e.target.value)}
                    placeholder="Texte à hasher..."
                    rows={2}
                  />
                  <Button onClick={generateHash} className="w-full">
                    Générer les Hash
                  </Button>
                  {hashResults && (
                    <div className="bg-muted rounded-lg p-4 space-y-3 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">SHA-1:</span>
                        <div className="flex justify-between items-center gap-2">
                          <code className="font-mono text-xs break-all">{hashResults.sha1}</code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => copyToClipboard(hashResults.sha1, "sha1")}
                          >
                            {copiedField === "sha1" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">SHA-256:</span>
                        <div className="flex justify-between items-center gap-2">
                          <code className="font-mono text-xs break-all">{hashResults.sha256}</code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => copyToClipboard(hashResults.sha256, "sha256")}
                          >
                            {copiedField === "sha256" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Outils système */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Chmod calculator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Calculateur Chmod
                  </CardTitle>
                  <CardDescription>
                    Calculez les permissions de fichiers Unix
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {(["owner", "group", "others"] as const).map((who) => (
                      <div key={who} className="flex items-center justify-between">
                        <span className="capitalize font-medium w-20">
                          {who === "owner" ? "Propriétaire" : who === "group" ? "Groupe" : "Autres"}
                        </span>
                        <div className="flex gap-4">
                          {(["read", "write", "execute"] as const).map((perm) => (
                            <label key={perm} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={chmodPerms[who][perm]}
                                onChange={() => togglePerm(who, perm)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm text-muted-foreground">
                                {perm === "read" ? "r" : perm === "write" ? "w" : "x"}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4 text-center">
                    <div className="text-muted-foreground text-sm mb-1">Commande:</div>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-2xl font-mono font-bold">chmod {calculateChmod()}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(`chmod ${calculateChmod()}`, "chmod")}
                      >
                        {copiedField === "chmod" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {chmodPerms.owner.read ? "r" : "-"}
                      {chmodPerms.owner.write ? "w" : "-"}
                      {chmodPerms.owner.execute ? "x" : "-"}
                      {chmodPerms.group.read ? "r" : "-"}
                      {chmodPerms.group.write ? "w" : "-"}
                      {chmodPerms.group.execute ? "x" : "-"}
                      {chmodPerms.others.read ? "r" : "-"}
                      {chmodPerms.others.write ? "w" : "-"}
                      {chmodPerms.others.execute ? "x" : "-"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Aide-mémoire commandes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Aide-Mémoire Commandes
                  </CardTitle>
                  <CardDescription>
                    Commandes Linux/Unix courantes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    {[
                      { cmd: "df -h", desc: "Espace disque" },
                      { cmd: "free -h", desc: "Mémoire" },
                      { cmd: "top -bn1 | head -20", desc: "Processus" },
                      { cmd: "ss -tlnp", desc: "Ports en écoute" },
                      { cmd: "systemctl status", desc: "État des services" },
                      { cmd: "journalctl -xe", desc: "Logs système" },
                      { cmd: "ip a", desc: "Interfaces réseau" },
                      { cmd: "docker ps -a", desc: "Conteneurs Docker" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3">
                          <code className="font-mono text-xs bg-background px-2 py-1 rounded">{item.cmd}</code>
                          <span className="text-muted-foreground">{item.desc}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(item.cmd, `cmd-${i}`)}
                        >
                          {copiedField === `cmd-${i}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminToolsPage;
