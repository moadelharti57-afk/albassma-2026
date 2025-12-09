import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { generateTicketCode, downloadTicketPDF } from '@/lib/ticketUtils';
import { CLUB_MEMBERS } from '@/lib/clubMembers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Ticket, CheckCircle } from 'lucide-react';

const registrationSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string().min(8, 'Phone must be at least 8 characters').max(20),
  registeredBy: z.string().min(1, 'Please select a club member'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export const RegistrationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    const code = generateTicketCode();

    try {
      // Insert participant
      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,
          ticket_code: code,
          registered_by: data.registeredBy,
        });

      if (insertError) throw insertError;

      const createdAt = new Date().toISOString();
      setTicketCode(code);

      // Download PDF
      await downloadTicketPDF(data.fullName, code, createdAt);

      // Send email via edge function
      try {
        await supabase.functions.invoke('send-ticket-email', {
          body: {
            email: data.email,
            fullName: data.fullName,
            ticketCode: code,
            createdAt,
          },
        });
      } catch (emailError) {
        console.log('Email sending failed, but ticket was created:', emailError);
      }

      setIsSuccess(true);
      toast({
        title: 'Registration Successful!',
        description: 'Your ticket has been downloaded. Check your email for confirmation.',
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewRegistration = () => {
    setIsSuccess(false);
    setTicketCode(null);
    reset();
  };

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto border-primary/20 shadow-lg">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">You're All Set!</h3>
          <p className="text-muted-foreground mb-4">
            Your ticket has been downloaded. Check your email for confirmation.
          </p>
          <div className="bg-muted p-4 rounded-lg mb-6">
            <p className="text-sm text-muted-foreground mb-1">Your Ticket Code</p>
            <p className="font-mono text-lg font-bold text-foreground">{ticketCode}</p>
          </div>
          <Button onClick={handleNewRegistration} variant="outline">
            Register Another Person
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto border-primary/20 shadow-lg">
      <CardHeader className="text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Ticket className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Get Your Ticket</CardTitle>
        <CardDescription>Fill in your details to register for the event</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              {...register('fullName')}
              className={errors.fullName ? 'border-destructive' : ''}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register('email')}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              {...register('phone')}
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="registeredBy">Club Member</Label>
            <Select onValueChange={(value) => setValue('registeredBy', value)}>
              <SelectTrigger className={errors.registeredBy ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select club member" />
              </SelectTrigger>
              <SelectContent>
                {CLUB_MEMBERS.map((member) => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.registeredBy && (
              <p className="text-sm text-destructive">{errors.registeredBy.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Ticket...
              </>
            ) : (
              'Register & Get Ticket'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
